from django.contrib import admin
from .models import PolicyRequest, UnderwriterReview, PolicyDocument

class ReviewInline(admin.TabularInline):
    model = UnderwriterReview
    extra = 0
    readonly_fields = ['reviewed_by', 'created_at']

class DocumentInline(admin.TabularInline):
    model = PolicyDocument
    extra = 0
    readonly_fields = ['uploaded_by', 'created_at']

@admin.register(PolicyRequest)
class PolicyRequestAdmin(admin.ModelAdmin):
    list_display  = ['reference_no', 'client_name', 'coverage_type', 'coverage_amount', 'status', 'requested_by', 'created_at']
    list_filter   = ['status', 'coverage_type', 'risk_level']
    search_fields = ['reference_no', 'client_name', 'client_email']
    readonly_fields = ['id', 'reference_no', 'created_at', 'updated_at', 'submitted_at']
    inlines = [ReviewInline, DocumentInline]

@admin.register(UnderwriterReview)
class UnderwriterReviewAdmin(admin.ModelAdmin):
    list_display = ['policy', 'reviewed_by', 'decision', 'created_at']
    readonly_fields = ['id', 'created_at']
