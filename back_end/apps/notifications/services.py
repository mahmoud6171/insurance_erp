"""
Pure Python service layer — creates Notification records and pushes
them to the Channels group. Imported by Celery tasks.
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification


def create_and_push(recipient, notif_type, title, message, object_type='', object_id=''):
    """Create a DB notification and push it over WebSocket."""
    notif = Notification.objects.create(
        recipient   = recipient,
        type        = notif_type,
        title       = title,
        message     = message,
        object_type = object_type,
        object_id   = object_id,
    )

    channel_layer = get_channel_layer()
    group_name    = f'notifications_{recipient.id}'

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type':        'notification.message',   # maps to consumer method
            'id':          str(notif.id),
            'notif_type':  notif.type,
            'title':       notif.title,
            'message':     notif.message,
            'object_type': notif.object_type,
            'object_id':   notif.object_id,
            'created_at':  notif.created_at.isoformat(),
        }
    )
    return notif
