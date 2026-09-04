import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):

    class Type(models.TextChoices):
        POLICY_SUBMITTED   = 'policy_submitted',   'Policy Submitted'
        POLICY_UNDER_REVIEW= 'policy_under_review', 'Policy Under Review'
        POLICY_APPROVED    = 'policy_approved',    'Policy Approved'
        POLICY_REJECTED    = 'policy_rejected',    'Policy Rejected'
        POLICY_MORE_INFO   = 'policy_more_info',   'More Info Needed'
        RENEWAL_REMINDER   = 'renewal_reminder',   'Renewal Reminder'
        REVIEW_SUBMITTED   = 'review_submitted',   'Review Submitted'
        TASK_ASSIGNED      = 'task_assigned',      'Task Assigned'
        TASK_UPDATED       = 'task_updated',       'Task Updated'
        TASK_COMPLETED     = 'task_completed',     'Task Completed'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications'
    )
    type        = models.CharField(max_length=30, choices=Type.choices)
    title       = models.CharField(max_length=200)
    message     = models.TextField()
    is_read     = models.BooleanField(default=False)

    # Generic link to any object
    object_type = models.CharField(max_length=50, blank=True)   # e.g. 'policy', 'task'
    object_id   = models.CharField(max_length=50, blank=True)   # UUID as string

    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.type}] → {self.recipient.email}'

    def mark_read(self):
        self.is_read = True
        self.save(update_fields=['is_read'])
