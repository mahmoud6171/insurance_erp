import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.policies.models import PolicyRequest, Beneficiary, CoverageItem, PolicyAuditLog

User = get_user_model()


@pytest.mark.django_db
class TestPolicyDetailAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='detail_agent@example.com',
            password='password123',
            first_name='Detail',
            last_name='Agent',
            role=User.Role.ADMIN
        )
        self.client.force_authenticate(user=self.user)

        self.policy = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='Emma Watson',
            client_email='emma@example.com',
            client_phone='999000',
            client_national_id='ID-EMMA',
            coverage_type='life',
            coverage_amount=Decimal('500000.00'),
            premium_amount=Decimal('2000.00'),
            version=1
        )
        self.beneficiary = Beneficiary.objects.create(
            policy=self.policy,
            full_name='Alex Watson',
            relationship='brother',
            benefit_percentage=Decimal('100.00')
        )
        self.coverage_item = CoverageItem.objects.create(
            policy=self.policy,
            name='Accidental Dismemberment',
            limit=Decimal('500000.00'),
            deductible=Decimal('500.00')
        )
        self.audit = PolicyAuditLog.objects.create(
            policy=self.policy,
            actor=self.user,
            action='create',
            diff={'initial': 'created'}
        )

    def test_get_detail_includes_nested_relations(self):
        response = self.client.get(f'/api/policies/{self.policy.id}/')
        assert response.status_code == 200
        data = response.data

        assert data['id'] == str(self.policy.id)
        assert data['version'] == 1
        assert len(data['beneficiaries']) == 1
        assert data['beneficiaries'][0]['full_name'] == 'Alex Watson'
        assert len(data['coverage_items']) == 1
        assert data['coverage_items'][0]['name'] == 'Accidental Dismemberment'
        assert len(data['audit_logs']) == 1
        assert data['audit_logs'][0]['action'] == 'create'
