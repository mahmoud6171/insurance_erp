from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import PolicyRequest, UnderwriterReview


# Track the old status before save
_old_status = {}

@receiver(pre_save, sender=PolicyRequest)
def capture_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            _old_status[instance.pk] = PolicyRequest.objects.get(pk=instance.pk).status
        except PolicyRequest.DoesNotExist:
            pass


@receiver(post_save, sender=PolicyRequest)
def policy_status_changed(sender, instance, created, **kwargs):
    from apps.notifications.tasks import notify_policy_status_change

    if created:
        return  # No notification on creation (still a draft)

    old = _old_status.pop(instance.pk, None)
    if old and old != instance.status:
        notify_policy_status_change.delay(str(instance.pk), old, instance.status)


@receiver(post_save, sender=UnderwriterReview)
def review_submitted(sender, instance, created, **kwargs):
    if created:
        from apps.notifications.tasks import notify_review_submitted
        notify_review_submitted.delay(str(instance.pk))
