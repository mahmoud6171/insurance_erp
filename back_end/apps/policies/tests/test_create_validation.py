import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestPolicyCreateValidation:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='agent2@example.com',
            password='password123',
            first_name='Agent',
            last_name='Two',
            role=User.Role.EMPLOYEE
        )
        self.client.force_authenticate(user=self.user)

    def test_beneficiary_percentage_sum_must_be_100(self):
        payload = {
            'client_name': 'Jane Doe',
            'client_email': 'jane@example.com',
            'client_phone': '+1234567890',
            'client_national_id': 'ID-12345',
            'coverage_type': 'life',
            'coverage_amount': '250000.00',
            'beneficiaries': [
                {'full_name': 'John Doe', 'relationship': 'spouse', 'benefit_percentage': '60.00'},
                {'full_name': 'Child Doe', 'relationship': 'child', 'benefit_percentage': '30.00'}  # Sum is 90%
            ]
        }
        response = self.client.post('/api/policies/', payload, format='json')
        assert response.status_code == 400
        assert 'beneficiaries' in response.data or 'non_field_errors' in response.data
