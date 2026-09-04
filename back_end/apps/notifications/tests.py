from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.policies.models import PolicyRequest
from apps.notifications.models import Notification
from apps.notifications.tasks import renewal_reminder, notify_expiring_policies

User = get_user_model()


class NotificationTasksTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='agent_notif@example.com',
            password='password123',
            first_name='Notif',
            last_name='Agent',
            role=User.Role.EMPLOYEE
        )

        today = date.today()
        # Policy up for renewal in 15 days
        self.renewal_policy = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='Renewal Client',
            client_email='client_renewal@example.com',
            client_phone='12345',
            client_national_id='ID-RNW',
            coverage_type='life',
            coverage_amount=Decimal('100000.00'),
            status=PolicyRequest.Status.APPROVED,
            end_date=today + timedelta(days=15),
            renewal_date=today + timedelta(days=15),
        )

    def test_renewal_reminder_creates_notification(self):
        result = renewal_reminder()
        assert 'Sent renewal reminders' in result
        notif = Notification.objects.filter(
            recipient=self.user,
            type=Notification.Type.RENEWAL_REMINDER
        ).first()
        assert notif is not None
        assert self.renewal_policy.reference_no in notif.title
