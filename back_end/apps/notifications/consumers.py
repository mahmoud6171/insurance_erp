import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Notification


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Each authenticated user joins their private group:  notifications_<user_id>
    The server pushes events; client can send { "action": "mark_read", "id": "<uuid>" }
    """

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.user       = user
        self.group_name = f'notifications_{user.id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send unread count on connect
        unread = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type':   'connected',
            'unread': unread,
        }))

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data   = json.loads(text_data or '{}')
            action = data.get('action')

            if action == 'mark_read' and data.get('id'):
                await self.mark_notification_read(data['id'])
                await self.send(text_data=json.dumps({
                    'type': 'marked_read',
                    'id':   data['id'],
                }))

            elif action == 'mark_all_read':
                await self.mark_all_read()
                await self.send(text_data=json.dumps({'type': 'all_marked_read'}))

        except (json.JSONDecodeError, Exception):
            pass

    # ── Group message handler (called by Celery tasks via channel_layer) ──────
    async def notification_message(self, event):
        """Handles messages of type 'notification.message' pushed to the group."""
        await self.send(text_data=json.dumps({
            'type':        'notification',
            'id':          event['id'],
            'notif_type':  event['notif_type'],
            'title':       event['title'],
            'message':     event['message'],
            'object_type': event.get('object_type', ''),
            'object_id':   event.get('object_id', ''),
            'created_at':  event['created_at'],
            'unread':      await self.get_unread_count(),
        }))

    # ── DB helpers ────────────────────────────────────────────────────────────
    @database_sync_to_async
    def get_unread_count(self):
        return Notification.objects.filter(recipient=self.user, is_read=False).count()

    @database_sync_to_async
    def mark_notification_read(self, notif_id):
        Notification.objects.filter(pk=notif_id, recipient=self.user).update(is_read=True)

    @database_sync_to_async
    def mark_all_read(self):
        Notification.objects.filter(recipient=self.user, is_read=False).update(is_read=True)
