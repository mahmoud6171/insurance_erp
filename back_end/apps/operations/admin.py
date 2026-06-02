from django.contrib import admin
from .models import OperationTask, TaskComment

class CommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0
    readonly_fields = ['author', 'created_at']

@admin.register(OperationTask)
class OperationTaskAdmin(admin.ModelAdmin):
    list_display  = ['title', 'priority', 'status', 'assigned_to', 'due_date', 'created_at']
    list_filter   = ['status', 'priority']
    search_fields = ['title', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at', 'completed_at']
    inlines = [CommentInline]
