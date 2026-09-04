import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.policies.models import PolicyRequest, PolicyAuditLog

User = get_user_model()


@pytest.mark.django_db
class TestPolicyAuditAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='audit_agent@example.com',
            password='password123',
            first_name='Audit',
            last_name='Agent',
            role=User.Role.ADMIN
        )
        self.client.force_authenticate(user=self.user)

        self.policy = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='Audit Subject',
            client_email='audit@example.com',
            client_phone='999000',
            client_national_id='ID-AUDIT',
            coverage_type='health',
            coverage_amount=Decimal('50000.00'),
        )
        PolicyAuditLog.objects.create(
            policy=self.policy,
            actor=self.user,
            action='create',
            diff={'after': {'status': 'draft'}},
            trace_id='trace-123'
        )
        PolicyAuditLog.objects.create(
            policy=self.policy,
            actor=self.user,
            action='submit',
            diff={'before': {'status': 'draft'}, 'after': {'status': 'approved'}},
            trace_id='trace-456'
        )

    def test_get_audit_trail_is_read_only_and_lists_entries(self):
        response = self.client.get(f'/api/policies/{self.policy.id}/audit/')
        assert response.status_code == 200
        assert len(response.data) == 2
        actions = [entry['action'] for entry in response.data]
        assert 'create' in actions
        assert 'submit' in actions

    def test_audit_endpoint_rejects_post(self):
        response = self.client.post(f'/api/policies/{self.policy.id}/audit/', {})
        assert response.status_code in [405, 404]
