import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.policies.models import PolicyRequest

User = get_user_model()


@pytest.mark.django_db
class TestPolicySearchAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='agent_search@example.com',
            password='password123',
            first_name='Search',
            last_name='Agent',
            role=User.Role.ADMIN
        )
        self.client.force_authenticate(user=self.user)

        self.p1 = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='Alice Smith',
            client_email='alice@example.com',
            client_phone='111',
            client_national_id='ID-111',
            coverage_type='life',
            coverage_amount=Decimal('100000.00'),
        )
        self.p2 = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='Bob Smith',
            client_email='bob@example.com',
            client_phone='222',
            client_national_id='ID-222',
            coverage_type='health',
            coverage_amount=Decimal('50000.00'),
        )
        self.p3 = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='Charlie Brown',
            client_email='charlie@example.com',
            client_phone='333',
            client_national_id='ID-333',
            coverage_type='auto',
            coverage_amount=Decimal('25000.00'),
        )

    def test_search_by_exact_reference(self):
        response = self.client.get(f'/api/policies/?q={self.p1.reference_no}')
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == str(self.p1.id)

    def test_search_by_surname(self):
        response = self.client.get('/api/policies/?q=Smith')
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 2
        names = [r['client_name'] for r in results]
        assert 'Alice Smith' in names
        assert 'Bob Smith' in names
