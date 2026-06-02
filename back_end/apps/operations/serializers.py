from rest_framework import serializers
from apps.users.serializers import UserSerializer
from .models import OperationTask, TaskComment


class TaskCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model  = TaskComment
        fields = ['id', 'task', 'author', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class OperationTaskSerializer(serializers.ModelSerializer):
    created_by  = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    comments    = TaskCommentSerializer(many=True, read_only=True)

    class Meta:
        model  = OperationTask
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'completed_at']


class OperationTaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OperationTask
        fields = ['title', 'description', 'priority', 'assigned_to',
                  'related_policy', 'due_date']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class OperationTaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OperationTask
        fields = ['title', 'description', 'priority', 'status',
                  'assigned_to', 'due_date']
