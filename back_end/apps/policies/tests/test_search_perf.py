import time
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.policies.models import PolicyRequest

User = get_user_model()


@pytest.mark.django_db
class TestSearchPerformance:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='perf_agent@example.com',
            password='password123',
            first_name='Perf',
            last_name='Tester',
            role=User.Role.ADMIN
        )
        self.client.force_authenticate(user=self.user)

        # Seed sample policy records
        policies = [
            PolicyRequest(
                requested_by=self.user,
                client_name=f'Client Surname_{i}',
                client_email=f'client{i}@example.com',
                client_phone=f'55500{i}',
                client_national_id=f'ID-{i}',
                coverage_type='life',
                coverage_amount=Decimal('100000.00'),
            )
            for i in range(100)
        ]
        PolicyRequest.objects.bulk_create(policies)

    def test_search_latency_under_500ms(self):
        target = PolicyRequest.objects.first()
        start = time.time()
        response = self.client.get(f'/api/policies/?q={target.reference_no}')
        elapsed = time.time() - start

        assert response.status_code == 200
        assert elapsed < 0.500  # < 500ms
