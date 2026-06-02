from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import OperationTask

_old_assigned = {}
_old_status   = {}

@receiver(pre_save, sender=OperationTask)
def capture_old_values(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = OperationTask.objects.get(pk=instance.pk)
            _old_assigned[instance.pk] = old.assigned_to_id
            _old_status[instance.pk]   = old.status
        except OperationTask.DoesNotExist:
            pass

@receiver(post_save, sender=OperationTask)
def task_changed(sender, instance, created, **kwargs):
    from apps.notifications.tasks import notify_task_assigned, notify_task_status_changed

    if created and instance.assigned_to:
        notify_task_assigned.delay(str(instance.id))
        return

    if not created:
        old_assigned = _old_assigned.pop(instance.pk, None)
        old_status   = _old_status.pop(instance.pk, None)

        # New assignee
        if instance.assigned_to and old_assigned != instance.assigned_to_id:
            notify_task_assigned.delay(str(instance.id))

        # Status changed
        if old_status and old_status != instance.status:
            notify_task_status_changed.delay(str(instance.id), instance.status)
