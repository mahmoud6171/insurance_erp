from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id', 'type', 'title', 'message', 'is_read',
                  'object_type', 'object_id', 'created_at']
        read_only_fields = fields
