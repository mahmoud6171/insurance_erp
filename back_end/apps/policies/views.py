from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.users.permissions import IsUnderwriterOrAdmin, IsOwnerOrAdmin
from .models import PolicyRequest, UnderwriterReview, PolicyDocument
from .serializers import (
    PolicyRequestListSerializer, PolicyRequestDetailSerializer,
    PolicyRequestCreateSerializer, PolicyStatusTransitionSerializer,
    UnderwriterReviewCreateSerializer, UnderwriterReviewSerializer,
    PolicyDocumentSerializer,
)


class PolicyRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['status', 'coverage_type', 'risk_level']
    search_fields      = ['client_name', 'client_email', 'reference_no']
    ordering_fields    = ['created_at', 'submitted_at', 'coverage_amount']

    def get_queryset(self):
        user = self.request.user
        qs   = PolicyRequest.objects.select_related('requested_by', 'assigned_to')
        if user.is_employee:
            return qs.filter(requested_by=user)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return PolicyRequestCreateSerializer
        if self.action == 'list':
            return PolicyRequestListSerializer
        return PolicyRequestDetailSerializer

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        policy = self.get_object()  #PolicyRequest.objects.get(pk=15)
        if policy.requested_by != request.user and not request.user.is_admin_user:
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            policy.transition_to(PolicyRequest.Status.PENDING, user=request.user)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PolicyRequestDetailSerializer(policy).data)

    @action(detail=True, methods=['post'], url_path='take',
            permission_classes=[IsUnderwriterOrAdmin])
    def take(self, request, pk=None):
        policy = self.get_object()
        try:
            policy.assigned_to = request.user
            policy.transition_to(PolicyRequest.Status.UNDER_REVIEW, user=request.user)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PolicyRequestDetailSerializer(policy).data)

    @action(detail=True, methods=['post'], url_path='review',
            permission_classes=[IsUnderwriterOrAdmin])
    def review(self, request, pk=None):
        policy = self.get_object()
        serializer = UnderwriterReviewCreateSerializer(
            data=request.data,
            context={'request': request, 'policy': policy}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        decision_map = {
            'approved':  PolicyRequest.Status.APPROVED,
            'rejected':  PolicyRequest.Status.REJECTED,
            'more_info': PolicyRequest.Status.MORE_INFO,
        }
        try:
            new_status = decision_map[review.decision]
            policy.transition_to(new_status, user=request.user)
            if review.premium_suggested:
                policy.premium_amount = review.premium_suggested
                policy.risk_level     = review.risk_assessment or policy.risk_level
                policy.save(update_fields=['premium_amount', 'risk_level'])
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UnderwriterReviewSerializer(review).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        qs   = self.get_queryset()
        data = {s: qs.filter(status=s).count() for s, _ in PolicyRequest.Status.choices}
        data['total'] = qs.count()
        return Response(data)

    # ── Document upload ───────────────────────────────────────────────────────
    @action(
        detail=True, methods=['post'], url_path='documents/upload',
        parser_classes=[parsers.MultiPartParser, parsers.FormParser],
    )
    def upload_document(self, request, pk=None):
        policy = self.get_object()
        file   = request.FILES.get('file')
        name   = request.data.get('name', file.name if file else 'document')

        if not file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # 10 MB guard
        if file.size > 10 * 1024 * 1024:
            return Response({'detail': 'File too large. Max 10 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        doc = PolicyDocument.objects.create(
            policy=policy,
            uploaded_by=request.user,
            name=name,
            file=file,
        )
        return Response(PolicyDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='documents')
    def list_documents(self, request, pk=None):
        policy = self.get_object()
        docs   = PolicyDocument.objects.filter(policy=policy)
        return Response(PolicyDocumentSerializer(docs, many=True).data)

    @action(detail=True, methods=['delete'], url_path=r'documents/(?P<doc_id>[^/.]+)/delete')
    def delete_document(self, request, pk=None, doc_id=None):
        policy = self.get_object()
        doc    = get_object_or_404(PolicyDocument, pk=doc_id, policy=policy)
        if doc.uploaded_by != request.user and not request.user.is_admin_user:
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        doc.file.delete(save=False)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PolicyDocumentViewSet(viewsets.ModelViewSet):
    serializer_class   = PolicyDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return PolicyDocument.objects.filter(policy_id=self.kwargs['policy_pk'])

    def perform_create(self, serializer):
        policy = get_object_or_404(PolicyRequest, pk=self.kwargs['policy_pk'])
        serializer.save(uploaded_by=self.request.user, policy=policy)
