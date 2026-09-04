import pytest
from decimal import Decimal
from unittest.mock import patch
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.policies.models import PolicyRequest
from apps.policies.services import CreditCheckUnavailable

User = get_user_model()


@pytest.mark.django_db
class TestCreditCheck:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='agent4@example.com',
            password='password123',
            first_name='Agent',
            last_name='Four',
            role=User.Role.EMPLOYEE
        )
        self.client.force_authenticate(user=self.user)

    @patch('apps.policies.services.CreditCheckService.check_credit')
    def test_credit_check_unavailable_returns_503(self, mock_check):
        mock_check.side_effect = CreditCheckUnavailable("Service Down")
        
        policy = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='Test Client',
            client_email='test@example.com',
            client_phone='12345',
            client_national_id='ID-FAIL',
            coverage_type='life',
            coverage_amount=Decimal('50000.00'),
            premium_amount=Decimal('1000.00'),
        )
        
        response = self.client.post(f'/api/policies/{policy.id}/submit/')
        assert response.status_code == 503
        assert 'detail' in response.data or 'error' in response.data
        
        # Verify status did not change to approved
        policy.refresh_from_db()
        assert policy.status == PolicyRequest.Status.DRAFT
