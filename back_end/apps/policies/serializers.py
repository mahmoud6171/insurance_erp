from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import APIException
from apps.users.serializers import UserSerializer
from .models import PolicyRequest, UnderwriterReview, PolicyDocument, Beneficiary, CoverageItem, PolicyAuditLog
from .services import log_policy_audit


class OptimisticLockConflict(APIException):
    status_code = 409
    default_detail = 'Record changed, please refresh.'
    default_code = 'record_changed'

    def __init__(self, current_version=None, detail=None):
        super().__init__(detail or self.default_detail)
        self.current_version = current_version


class BeneficiarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Beneficiary
        fields = ['id', 'full_name', 'relationship', 'benefit_percentage', 'created_at']
        read_only_fields = ['id', 'created_at']


class CoverageItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoverageItem
        fields = ['id', 'name', 'limit', 'deductible', 'created_at']
        read_only_fields = ['id', 'created_at']


class PolicyAuditLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = PolicyAuditLog
        fields = ['id', 'actor', 'action', 'diff', 'trace_id', 'created_at']
        read_only_fields = '__all__'


class PolicyDocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = PolicyDocument
        fields = ['id', 'name', 'file', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']


class UnderwriterReviewSerializer(serializers.ModelSerializer):
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = UnderwriterReview
        fields = [
            'id', 'policy', 'reviewed_by', 'decision',
            'notes', 'premium_suggested', 'risk_assessment', 'created_at'
        ]
        read_only_fields = ['id', 'reviewed_by', 'created_at']


class PolicyRequestListSerializer(serializers.ModelSerializer):
    """Lightweight — for list views."""
    requested_by = UserSerializer(read_only=True)
    assigned_to  = UserSerializer(read_only=True)

    class Meta:
        model = PolicyRequest
        fields = [
            'id', 'reference_no', 'client_name', 'coverage_type',
            'coverage_amount', 'premium_amount', 'status', 'risk_level',
            'version', 'renewal_date', 'requires_approval',
            'requested_by', 'assigned_to', 'created_at', 'submitted_at'
        ]


class PolicyRequestDetailSerializer(serializers.ModelSerializer):
    """Full detail including nested beneficiaries, coverage, reviews, documents, and audit logs."""
    requested_by   = UserSerializer(read_only=True)
    assigned_to    = UserSerializer(read_only=True)
    beneficiaries  = BeneficiarySerializer(many=True, read_only=True)
    coverage_items = CoverageItemSerializer(many=True, read_only=True)
    reviews        = UnderwriterReviewSerializer(many=True, read_only=True)
    documents      = PolicyDocumentSerializer(many=True, read_only=True)
    audit_logs     = PolicyAuditLogSerializer(many=True, read_only=True)

    class Meta:
        model = PolicyRequest
        fields = '__all__'
        read_only_fields = ['id', 'reference_no', 'requested_by', 'status',
                            'created_at', 'updated_at', 'submitted_at', 'version', 'renewal_date']


class PolicyRequestCreateSerializer(serializers.ModelSerializer):
    beneficiaries  = BeneficiarySerializer(many=True, required=False)
    coverage_items = CoverageItemSerializer(many=True, required=False)

    class Meta:
        model = PolicyRequest
        fields = [
            'id', 'reference_no', 'client_name', 'client_email', 'client_phone', 'client_national_id',
            'client_dob', 'client_address', 'coverage_type', 'coverage_amount', 'premium_amount',
            'start_date', 'end_date', 'notes', 'beneficiaries', 'coverage_items', 'version', 'status', 'renewal_date'
        ]
        read_only_fields = ['id', 'reference_no', 'version', 'status', 'renewal_date']

    def validate_beneficiaries(self, value):
        if value:
            total = sum(Decimal(str(item.get('benefit_percentage', 0))) for item in value)
            if total != Decimal('100.00'):
                raise serializers.ValidationError(
                    f"Total beneficiary percentage must equal 100%. Current total: {total}%"
                )
        return value

    def create(self, validated_data):
        beneficiaries_data = validated_data.pop('beneficiaries', [])
        coverage_items_data = validated_data.pop('coverage_items', [])
        user = self.context['request'].user
        validated_data['requested_by'] = user

        with transaction.atomic():
            policy = PolicyRequest.objects.create(**validated_data)

            for b_data in beneficiaries_data:
                Beneficiary.objects.create(policy=policy, **b_data)

            for c_data in coverage_items_data:
                CoverageItem.objects.create(policy=policy, **c_data)

            # Audit log for creation
            log_policy_audit(
                policy=policy,
                actor=user,
                action='create',
                diff={'after': {
                    'reference_no': policy.reference_no,
                    'coverage_type': policy.coverage_type,
                    'coverage_amount': str(policy.coverage_amount),
                    'premium_amount': str(policy.premium_amount) if policy.premium_amount else None,
                    'status': policy.status,
                    'beneficiaries_count': len(beneficiaries_data),
                    'coverage_items_count': len(coverage_items_data),
                }}
            )

        return policy


class PolicyRequestUpdateSerializer(serializers.ModelSerializer):
    beneficiaries  = BeneficiarySerializer(many=True, required=False)
    coverage_items = CoverageItemSerializer(many=True, required=False)
    version        = serializers.IntegerField(required=False)

    class Meta:
        model = PolicyRequest
        fields = [
            'client_name', 'client_email', 'client_phone',
            'client_dob', 'client_address', 'coverage_type', 'coverage_amount', 'premium_amount',
            'start_date', 'end_date', 'risk_level', 'notes', 'beneficiaries', 'coverage_items', 'version'
        ]

    def update(self, instance, validated_data):
        request = self.context.get('request')
        
        # Check If-Match header or body version for optimistic locking
        header_match = request.headers.get('If-Match') if request else None
        expected_version = None
        if header_match:
            try:
                expected_version = int(header_match.strip('"\''))
            except ValueError:
                pass
        elif 'version' in validated_data:
            expected_version = validated_data.pop('version')

        if expected_version is not None and expected_version != instance.version:
            raise OptimisticLockConflict(
                current_version=instance.version,
                detail={'error': 'record_changed', 'message': 'Record changed, please refresh.', 'current_version': instance.version}
            )

        beneficiaries_data = validated_data.pop('beneficiaries', None)
        coverage_items_data = validated_data.pop('coverage_items', None)

        before_diff = {}
        after_diff = {}

        for attr, value in validated_data.items():
            old_val = getattr(instance, attr)
            if old_val != value:
                before_diff[attr] = str(old_val) if isinstance(old_val, Decimal) else old_val
                after_diff[attr] = str(value) if isinstance(value, Decimal) else value
                setattr(instance, attr, value)

        instance.version = instance.version + 1
        instance.save()

        if beneficiaries_data is not None:
            instance.beneficiaries.all().delete()
            for b_data in beneficiaries_data:
                Beneficiary.objects.create(policy=instance, **b_data)

        if coverage_items_data is not None:
            instance.coverage_items.all().delete()
            for c_data in coverage_items_data:
                CoverageItem.objects.create(policy=instance, **c_data)

        user = request.user if request else None
        log_policy_audit(
            policy=instance,
            actor=user,
            action='edit',
            diff={'before': before_diff, 'after': after_diff}
        )

        return instance


class PolicyStatusTransitionSerializer(serializers.Serializer):
    status  = serializers.ChoiceField(choices=PolicyRequest.Status.choices)
    comment = serializers.CharField(required=False, allow_blank=True)


class UnderwriterReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnderwriterReview
        fields = ['decision', 'notes', 'premium_suggested', 'risk_assessment']

    def create(self, validated_data):
        validated_data['reviewed_by'] = self.context['request'].user
        validated_data['policy']      = self.context['policy']
        return super().create(validated_data)
