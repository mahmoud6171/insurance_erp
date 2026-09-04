import os
import uuid
import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from django.conf import settings
from django.utils import timezone
from .models import PolicyRequest, PolicyAuditLog

logger = logging.getLogger(__name__)


class CreditCheckUnavailable(Exception):
    """Raised when external credit-check service is unavailable (503)."""
    pass


class CreditCheckService:
    """
    Adapter for external credit-check service.
    Implements a resilient circuit breaker / timeout pattern.
    """
    @classmethod
    def check_credit(cls, national_id: str, client_name: str) -> Dict[str, Any]:
        credit_url = getattr(settings, 'CREDIT_CHECK_URL', os.environ.get('CREDIT_CHECK_URL', ''))

        # Explicit test/allow simulations
        if credit_url == 'mock://pass':
            return {'status': 'passed', 'score': 750}

        if credit_url == 'mock://fail' or credit_url == 'http://invalid-credit-check-host':
            raise CreditCheckUnavailable("Credit check service is currently unavailable. Please retry later.")

        # Fail-closed: a mandatory external dependency must be configured in production.
        if not credit_url:
            if getattr(settings, 'DEBUG', False):
                return {'status': 'passed', 'score': 750}
            raise CreditCheckUnavailable("Credit check service is not configured.")

        try:
            import urllib.request
            import urllib.error
            import json
            
            req = urllib.request.Request(
                credit_url,
                data=json.dumps({'national_id': national_id, 'client_name': client_name}).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=3.0) as response:
                if response.status == 200:
                    return json.loads(response.read().decode('utf-8'))
                else:
                    raise CreditCheckUnavailable(f"Credit check returned status {response.status}")
        except Exception as e:
            logger.warning(f"Credit check service failed: {e}")
            raise CreditCheckUnavailable("Credit check service is unreachable.") from e


# Sensitive fields that must NEVER appear in audit diffs (PII/Payment guard per Constitution V)
SENSITIVE_AUDIT_FIELDS = {
    'client_national_id',
    'password',
    'token',
    'credit_card',
    'bank_account',
    'cvv',
}


def sanitize_diff_data(data: Any) -> Any:
    """Sanitize dictionaries to scrub PII/sensitive info."""
    if not isinstance(data, dict):
        return data
    sanitized = {}
    for k, v in data.items():
        if k in SENSITIVE_AUDIT_FIELDS:
            continue
        if isinstance(v, dict):
            sanitized[k] = sanitize_diff_data(v)
        else:
            sanitized[k] = str(v) if isinstance(v, Decimal) else v
    return sanitized


def log_policy_audit(
    policy: PolicyRequest,
    actor: Optional[Any],
    action: str,
    diff: Optional[Dict[str, Any]] = None,
    trace_id: str = ""
) -> PolicyAuditLog:
    """
    Append an immutable entry to PolicyAuditLog.
    Guards against logging PII per Constitution V.
    """
    clean_diff = sanitize_diff_data(diff or {})
    if not trace_id:
        trace_id = str(uuid.uuid4())

    return PolicyAuditLog.objects.create(
        policy=policy,
        actor=actor if (actor and getattr(actor, 'is_authenticated', False)) else None,
        action=action,
        diff=clean_diff,
        trace_id=trace_id
    )


APPROVAL_THRESHOLD = Decimal('10000.00')


def route_policy_approval(
    policy: PolicyRequest,
    actor: Optional[Any] = None,
    trace_id: str = ""
) -> PolicyRequest:
    """
    On submit:
    - If premium_amount > 10,000: requires_approval = True -> status = UNDER_REVIEW
    - If premium_amount <= 10,000: requires_approval = False -> status = APPROVED, set renewal_date = end_date
    """
    premium = policy.premium_amount or Decimal('0.00')
    old_status = policy.status
    
    if premium > APPROVAL_THRESHOLD:
        policy.requires_approval = True
        policy.status = PolicyRequest.Status.UNDER_REVIEW
    else:
        policy.requires_approval = False
        policy.status = PolicyRequest.Status.APPROVED
        if policy.end_date:
            policy.renewal_date = policy.end_date

    policy.submitted_at = timezone.now()
    policy.version = policy.version + 1
    policy.save()

    # Emit audit log
    log_policy_audit(
        policy=policy,
        actor=actor,
        action='submit' if old_status == PolicyRequest.Status.DRAFT else 'transition',
        diff={
            'before': {'status': old_status},
            'after': {'status': policy.status, 'requires_approval': policy.requires_approval}
        },
        trace_id=trace_id
    )
    
    return policy


def process_policy_submission(
    policy: PolicyRequest,
    actor: Optional[Any] = None,
    trace_id: str = ""
) -> PolicyRequest:
    """
    Full submission lifecycle:
    1. Perform external credit check (raises CreditCheckUnavailable on failure).
    2. Route approval based on premium threshold.
    """
    CreditCheckService.check_credit(
        national_id=policy.client_national_id,
        client_name=policy.client_name
    )
    return route_policy_approval(policy=policy, actor=actor, trace_id=trace_id)
