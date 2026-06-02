import uuid
from django.db import models
from django.conf import settings


class OperationTask(models.Model):

    class Status(models.TextChoices):
        OPEN        = 'open',        'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        ON_HOLD     = 'on_hold',     'On Hold'
        DONE        = 'done',        'Done'
        CANCELLED   = 'cancelled',   'Cancelled'

    class Priority(models.TextChoices):
        LOW    = 'low',    'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH   = 'high',   'High'
        URGENT = 'urgent', 'Urgent'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority    = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status      = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)

    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='created_tasks'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_tasks'
    )

    # Optional link to a policy request
    related_policy = models.ForeignKey(
        'policies.PolicyRequest', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tasks'
    )

    due_date    = models.DateField(null=True, blank=True)
    completed_at= models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return f'[{self.priority.upper()}] {self.title} — {self.status}'

    def complete(self):
        from django.utils import timezone
        self.status       = self.Status.DONE
        self.completed_at = timezone.now()
        self.save()


class TaskComment(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task       = models.ForeignKey(OperationTask, on_delete=models.CASCADE, related_name='comments')
    author     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    content    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Comment by {self.author.full_name} on {self.task.title}'
