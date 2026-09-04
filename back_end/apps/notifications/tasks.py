"""
Celery tasks — each task handles one notification scenario:
  1. look up the right recipients
  2. call services.create_and_push() for each
  3. send email
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings


# ── Policy notifications ───────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_policy_status_change(self, policy_id, old_status, new_status):
    try:
        from apps.policies.models import PolicyRequest
        from apps.users.models import User
        from .services import create_and_push
        from .models import Notification

        policy = PolicyRequest.objects.select_related('requested_by', 'assigned_to').get(pk=policy_id)

        STATUS_CONFIG = {
            PolicyRequest.Status.PENDING: {
                'type':       Notification.Type.POLICY_SUBMITTED,
                'title':      f'New Policy Request: {policy.reference_no}',
                'message':    f'{policy.requested_by.full_name} submitted a new {policy.get_coverage_type_display()} policy request for {policy.client_name}. Coverage: {policy.coverage_amount:,.0f}.',
                'recipients': list(User.objects.filter(role=User.Role.UNDERWRITER, is_active=True)),
            },
            PolicyRequest.Status.UNDER_REVIEW: {
                'type':       Notification.Type.POLICY_UNDER_REVIEW,
                'title':      f'Policy {policy.reference_no} is under review',
                'message':    f'Your policy request for {policy.client_name} is now being reviewed by {policy.assigned_to.full_name if policy.assigned_to else "an underwriter"}.',
                'recipients': [policy.requested_by],
            },
            PolicyRequest.Status.APPROVED: {
                'type':       Notification.Type.POLICY_APPROVED,
                'title':      f'Policy {policy.reference_no} Approved ✓',
                'message':    f'Great news! The policy request for {policy.client_name} has been approved. Premium: {policy.premium_amount or "TBD"}.',
                'recipients': [policy.requested_by],
            },
            PolicyRequest.Status.REJECTED: {
                'type':       Notification.Type.POLICY_REJECTED,
                'title':      f'Policy {policy.reference_no} Rejected',
                'message':    f'The policy request for {policy.client_name} has been rejected. Please check the review notes for details.',
                'recipients': [policy.requested_by],
            },
            PolicyRequest.Status.MORE_INFO: {
                'type':       Notification.Type.POLICY_MORE_INFO,
                'title':      f'More Information Required — {policy.reference_no}',
                'message':    f'The underwriter needs more information for the policy request for {policy.client_name}. Please review the notes and resubmit.',
                'recipients': [policy.requested_by],
            },
        }

        config = STATUS_CONFIG.get(new_status)
        if not config:
            return

        for recipient in config['recipients']:
            # In-app + WS push
            create_and_push(
                recipient   = recipient,
                notif_type  = config['type'],
                title       = config['title'],
                message     = config['message'],
                object_type = 'policy',
                object_id   = str(policy.id),
            )
            # Email
            _send_notification_email(
                to      = recipient.email,
                subject = config['title'],
                body    = config['message'],
            )

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_review_submitted(self, review_id):
    try:
        from apps.policies.models import UnderwriterReview
        from .services import create_and_push
        from .models import Notification

        review = UnderwriterReview.objects.select_related(
            'policy__requested_by', 'reviewed_by'
        ).get(pk=review_id)

        policy    = review.policy
        recipient = policy.requested_by

        create_and_push(
            recipient   = recipient,
            notif_type  = Notification.Type.REVIEW_SUBMITTED,
            title       = f'Review submitted for {policy.reference_no}',
            message     = f'{review.reviewed_by.full_name} reviewed your policy request. Decision: {review.get_decision_display()}.',
            object_type = 'policy',
            object_id   = str(policy.id),
        )
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Operations notifications ───────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_task_assigned(self, task_id):
    try:
        from apps.operations.models import OperationTask
        from .services import create_and_push
        from .models import Notification

        task = OperationTask.objects.select_related('assigned_to', 'created_by').get(pk=task_id)
        if not task.assigned_to:
            return

        create_and_push(
            recipient   = task.assigned_to,
            notif_type  = Notification.Type.TASK_ASSIGNED,
            title       = f'New Task Assigned: {task.title}',
            message     = f'You have been assigned a new {task.get_priority_display()}-priority task: "{task.title}" by {task.created_by.full_name}. Due: {task.due_date or "No deadline"}.',
            object_type = 'task',
            object_id   = str(task.id),
        )
        _send_notification_email(
            to      = task.assigned_to.email,
            subject = f'New Task: {task.title}',
            body    = f'You have been assigned: {task.title}\nPriority: {task.get_priority_display()}\nDue: {task.due_date or "N/A"}',
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_task_status_changed(self, task_id, new_status):
    try:
        from apps.operations.models import OperationTask
        from .services import create_and_push
        from .models import Notification

        task = OperationTask.objects.select_related('assigned_to', 'created_by').get(pk=task_id)

        recipients = set()
        if task.assigned_to:
            recipients.add(task.assigned_to)
        if task.created_by:
            recipients.add(task.created_by)

        for recipient in recipients:
            create_and_push(
                recipient   = recipient,
                notif_type  = Notification.Type.TASK_UPDATED,
                title       = f'Task Updated: {task.title}',
                message     = f'Task "{task.title}" status changed to {task.get_status_display()}.',
                object_type = 'task',
                object_id   = str(task.id),
            )
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _send_notification_email(to, subject, body):
    try:
        send_mail(
            subject         = subject,
            message         = body,
            from_email      = settings.DEFAULT_FROM_EMAIL,
            recipient_list  = [to],
            fail_silently   = True,
        )
    except Exception:
        pass


# ── Scheduled / Beat tasks ─────────────────────────────────────────────────────

@shared_task
def remind_stale_pending_policies():
    """
    Daily @ 8 AM — ping underwriters about policies that have been
    sitting in PENDING for more than 24 hours without anyone taking them.
    """
    from django.utils import timezone
    from datetime import timedelta
    from apps.policies.models import PolicyRequest
    from apps.users.models import User
    from .services import create_and_push
    from .models import Notification

    cutoff   = timezone.now() - timedelta(hours=24)
    stale    = PolicyRequest.objects.filter(
        status=PolicyRequest.Status.PENDING,
        submitted_at__lte=cutoff,
    ).select_related('requested_by')

    if not stale.exists():
        return f'No stale policies found.'

    underwriters = User.objects.filter(role=User.Role.UNDERWRITER, is_active=True)
    count        = stale.count()

    for uw in underwriters:
        create_and_push(
            recipient   = uw,
            notif_type  = Notification.Type.POLICY_SUBMITTED,
            title       = f'⏰ {count} policy request{"s" if count > 1 else ""} awaiting review',
            message     = f'{count} pending policy request{"s have" if count > 1 else " has"} been waiting for more than 24 hours. Please review as soon as possible.',
            object_type = 'policy',
            object_id   = '',
        )
        _send_notification_email(
            to      = uw.email,
            subject = f'[InsureFlow] {count} pending policies need your attention',
            body    = f'Dear {uw.full_name},\n\n{count} policy request{"s are" if count > 1 else " is"} pending review for more than 24 hours.\nPlease log in to InsureFlow to review them.\n\nThank you.',
        )

    return f'Reminded {underwriters.count()} underwriters about {count} stale policies.'


@shared_task
def notify_expiring_policies():
    """
    Daily @ 9 AM — alert employees about approved policies expiring within 30 days.
    """
    from django.utils import timezone
    from datetime import timedelta, date
    from apps.policies.models import PolicyRequest
    from .services import create_and_push
    from .models import Notification

    today       = date.today()
    in_30_days  = today + timedelta(days=30)

    expiring = PolicyRequest.objects.filter(
        status   = PolicyRequest.Status.APPROVED,
        end_date__gte = today,
        end_date__lte = in_30_days,
    ).select_related('requested_by')

    notified = 0
    for policy in expiring:
        days_left = (policy.end_date - today).days
        create_and_push(
            recipient   = policy.requested_by,
            notif_type  = Notification.Type.POLICY_MORE_INFO,
            title       = f'Policy {policy.reference_no} expiring in {days_left} day{"s" if days_left != 1 else ""}',
            message     = f'The policy for {policy.client_name} ({policy.get_coverage_type_display()}) is set to expire on {policy.end_date.strftime("%B %d, %Y")}. Please initiate a renewal if required.',
            object_type = 'policy',
            object_id   = str(policy.id),
        )
        _send_notification_email(
            to      = policy.requested_by.email,
            subject = f'[InsureFlow] Policy {policy.reference_no} expiring soon',
            body    = f'Dear {policy.requested_by.full_name},\n\nPolicy {policy.reference_no} for {policy.client_name} will expire on {policy.end_date}.\nPlease take action if renewal is required.\n\nInsureFlow ERP',
        )
        notified += 1

    return f'Sent expiry reminders for {notified} policies.'


@shared_task
def renewal_reminder():
    """
    Daily @ 9 AM — alert agents and clients about approved policies approaching renewal (30 days before renewal_date).
    """
    from datetime import timedelta, date
    from apps.policies.models import PolicyRequest
    from .services import create_and_push
    from .models import Notification

    today = date.today()
    in_30_days = today + timedelta(days=30)

    renewals = PolicyRequest.objects.filter(
        status=PolicyRequest.Status.APPROVED,
        renewal_date__isnull=False,
        renewal_date__gte=today,
        renewal_date__lte=in_30_days,
    ).select_related('requested_by')

    notified = 0
    for policy in renewals:
        days_left = (policy.renewal_date - today).days
        title = f'Renewal Reminder: Policy {policy.reference_no} ({days_left} days)'
        message = f'Policy {policy.reference_no} for {policy.client_name} is up for renewal on {policy.renewal_date.strftime("%B %d, %Y")}.'

        create_and_push(
            recipient=policy.requested_by,
            notif_type=Notification.Type.RENEWAL_REMINDER,
            title=title,
            message=message,
            object_type='policy',
            object_id=str(policy.id),
        )

        if policy.requested_by.email:
            _send_notification_email(
                to=policy.requested_by.email,
                subject=f'[InsureFlow] {title}',
                body=f'Dear {policy.requested_by.full_name},\n\n{message}\nPlease review renewal options.\n\nInsureFlow ERP',
            )

        if policy.client_email:
            _send_notification_email(
                to=policy.client_email,
                subject=f'[InsureFlow] Your policy {policy.reference_no} is up for renewal',
                body=f'Dear {policy.client_name},\n\nYour {policy.get_coverage_type_display()} policy ({policy.reference_no}) is scheduled for renewal on {policy.renewal_date}.\n\nThank you for choosing InsureFlow.',
            )

        notified += 1

    return f'Sent renewal reminders for {notified} policies.'


@shared_task
def send_weekly_task_digest():
    """
    Every Monday @ 8 AM — send each ops_manager a digest of open/overdue tasks.
    """
    from django.utils import timezone
    from datetime import date
    from apps.operations.models import OperationTask
    from apps.users.models import User
    from .services import create_and_push
    from .models import Notification

    today       = date.today()
    managers    = User.objects.filter(role=User.Role.OPS_MANAGER, is_active=True)

    for manager in managers:
        open_tasks    = OperationTask.objects.filter(
            status__in=[OperationTask.Status.OPEN, OperationTask.Status.IN_PROGRESS],
            created_by=manager,
        )
        overdue_tasks = open_tasks.filter(due_date__lt=today)

        open_count    = open_tasks.count()
        overdue_count = overdue_tasks.count()

        if open_count == 0:
            continue

        overdue_phrase = f', including {overdue_count} overdue' if overdue_count else ''
        create_and_push(
            recipient   = manager,
            notif_type  = Notification.Type.TASK_UPDATED,
            title       = f'Weekly digest: {open_count} open task{"s" if open_count > 1 else ""}',
            message     = f'You have {open_count} open task{"s" if open_count > 1 else ""} this week{overdue_phrase}. Review your operations board.',
            object_type = 'task',
            object_id   = '',
        )

        # Build a plain text task list for the email
        task_lines = '\n'.join(
            f'  [{t.get_priority_display()}] {t.title} — due {t.due_date or "no date"} {"(OVERDUE)" if t.due_date and t.due_date < today else ""}'
            for t in open_tasks[:20]
        )
        overdue_text = f'⚠ {overdue_count} task(s) are overdue.\n\n' if overdue_count else ''
        _send_notification_email(
            to      = manager.email,
            subject = f'[InsureFlow] Weekly task digest — {open_count} open tasks',
            body    = f'Dear {manager.full_name},\n\nYour weekly task summary:\n\n{task_lines}\n\n{overdue_text}Log in to InsureFlow to manage your tasks.\n\nInsureFlow ERP',
        )

    return f'Sent weekly digest to {managers.count()} managers.'
