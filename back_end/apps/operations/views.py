from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.users.permissions import IsOpsManager
from .models import OperationTask, TaskComment
from .serializers import (
    OperationTaskSerializer, OperationTaskCreateSerializer,
    OperationTaskUpdateSerializer, TaskCommentSerializer,
)


class OperationTaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['status', 'priority', 'assigned_to']
    search_fields      = ['title', 'description']
    ordering_fields    = ['priority', 'due_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs   = OperationTask.objects.select_related('created_by', 'assigned_to')
        if user.is_ops_manager or user.is_admin_user:
            return qs
        return qs.filter(Q(assigned_to=user) | Q(created_by=user))

    def get_serializer_class(self):
        if self.action == 'create':
            return OperationTaskCreateSerializer
        if self.action in ('update', 'partial_update'):
            return OperationTaskUpdateSerializer
        return OperationTaskSerializer

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        task = self.get_object()
        task.complete()
        return Response(OperationTaskSerializer(task).data)

    @action(detail=True, methods=['post'], url_path='comments')
    def add_comment(self, request, pk=None):
        task = self.get_object()
        serializer = TaskCommentSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='my-tasks')
    def my_tasks(self, request):
        qs = OperationTask.objects.filter(assigned_to=request.user).exclude(
            status__in=[OperationTask.Status.DONE, OperationTask.Status.CANCELLED]
        )
        return Response(OperationTaskSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        qs = self.get_queryset()
        data = {s: qs.filter(status=s).count() for s, _ in OperationTask.Status.choices}
        data['total'] = qs.count()
        return Response(data)
