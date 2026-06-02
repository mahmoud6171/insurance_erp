from rest_framework import serializers
from apps.users.serializers import UserSerializer
from .models import PolicyRequest, UnderwriterReview, PolicyDocument


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
            'coverage_amount', 'status', 'risk_level',
            'requested_by', 'assigned_to', 'created_at', 'submitted_at'
        ]


class PolicyRequestDetailSerializer(serializers.ModelSerializer):
    """Full detail including nested reviews and documents."""
    requested_by = UserSerializer(read_only=True)
    assigned_to  = UserSerializer(read_only=True)
    reviews      = UnderwriterReviewSerializer(many=True, read_only=True)
    documents    = PolicyDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = PolicyRequest
        fields = '__all__'
        read_only_fields = ['id', 'reference_no', 'requested_by', 'status',
                            'created_at', 'updated_at', 'submitted_at']


class PolicyRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyRequest
        fields = [
            'client_name', 'client_email', 'client_phone', 'client_national_id',
            'client_dob', 'client_address', 'coverage_type', 'coverage_amount',
            'start_date', 'end_date', 'notes',
        ]

    def create(self, validated_data):
        validated_data['requested_by'] = self.context['request'].user
        return super().create(validated_data)


class PolicyStatusTransitionSerializer(serializers.Serializer):
    """Used by the /transition/ action."""
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
