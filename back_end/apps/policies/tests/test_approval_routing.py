import pytest
from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.policies.models import PolicyRequest
from apps.policies.services import process_policy_submission

User = get_user_model()


@pytest.mark.django_db
class TestApprovalRouting:
    def setup_method(self):
        self.user = User.objects.create_user(
            email='agent3@example.com',
            password='password123',
            first_name='Agent',
            last_name='Three',
            role=User.Role.EMPLOYEE
        )

    def test_low_premium_auto_approves(self):
        policy = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='Low Premium Client',
            client_email='low@example.com',
            client_phone='12345',
            client_national_id='ID-LOW',
            coverage_type='life',
            coverage_amount=Decimal('50000.00'),
            premium_amount=Decimal('1200.00'),
            start_date=date(2026, 9, 1),
            end_date=date(2027, 8, 31),
        )
        updated = process_policy_submission(policy, actor=self.user)
        assert updated.status == PolicyRequest.Status.APPROVED
        assert updated.requires_approval is False
        assert updated.renewal_date == date(2027, 8, 31)

    def test_high_premium_routes_to_under_review(self):
        policy = PolicyRequest.objects.create(
            requested_by=self.user,
            client_name='High Premium Client',
            client_email='high@example.com',
            client_phone='12345',
            client_national_id='ID-HIGH',
            coverage_type='commercial',
            coverage_amount=Decimal('1000000.00'),
            premium_amount=Decimal('15000.00'),
            start_date=date(2026, 9, 1),
            end_date=date(2027, 8, 31),
        )
        updated = process_policy_submission(policy, actor=self.user)
        assert updated.status == PolicyRequest.Status.UNDER_REVIEW
        assert updated.requires_approval is True
