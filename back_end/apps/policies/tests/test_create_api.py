import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.policies.models import PolicyRequest

User = get_user_model()


@pytest.mark.django_db
class TestPolicyCreateAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='agent@example.com',
            password='password123',
            first_name='Agent',
            last_name='User',
            role=User.Role.EMPLOYEE
        )
        self.client.force_authenticate(user=self.user)

    def test_create_policy_success(self):
        payload = {
            'client_name': 'Jane Doe',
            'client_email': 'jane@example.com',
            'client_phone': '+1234567890',
            'client_national_id': 'ID-12345',
            'client_dob': '1985-04-12',
            'client_address': '12 Oak St',
            'coverage_type': 'life',
            'coverage_amount': '250000.00',
            'premium_amount': '1200.00',
            'start_date': '2026-09-01',
            'end_date': '2027-08-31',
            'beneficiaries': [
                {'full_name': 'John Doe', 'relationship': 'spouse', 'benefit_percentage': '100.00'}
            ],
            'coverage_items': [
                {'name': 'Accidental Death', 'limit': '250000.00', 'deductible': '0.00'}
            ]
        }
        response = self.client.post('/api/policies/', payload, format='json')
        assert response.status_code == 201
        data = response.data
        assert data['reference_no'].startswith('POL-')
        assert len(data['reference_no']) == 12  # POL- + 8 chars
        assert data['status'] == PolicyRequest.Status.DRAFT
        assert data['version'] == 1
        assert PolicyRequest.objects.filter(id=data['id']).exists()
