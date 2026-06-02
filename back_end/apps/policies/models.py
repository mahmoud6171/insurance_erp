import uuid
from django.db import models
from django.conf import settings


class PolicyRequest(models.Model):

    class Status(models.TextChoices):
        DRAFT        = 'draft',        'Draft'
        PENDING      = 'pending',      'Pending Review'
        UNDER_REVIEW = 'under_review', 'Under Review'
        MORE_INFO    = 'more_info',    'More Info Needed'
        APPROVED     = 'approved',     'Approved'
        REJECTED     = 'rejected',     'Rejected'

    class CoverageType(models.TextChoices):
        LIFE       = 'life',       'Life Insurance'
        HEALTH     = 'health',     'Health Insurance'
        AUTO       = 'auto',       'Auto Insurance'
        PROPERTY   = 'property',   'Property Insurance'
        LIABILITY  = 'liability',  'Liability Insurance'
        COMMERCIAL = 'commercial', 'Commercial Insurance'

    # ── Identity ──────────────────────────────────────────────────────────────
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_no   = models.CharField(max_length=20, unique=True, blank=True)

    # ── Ownership ─────────────────────────────────────────────────────────────
    requested_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='policy_requests'
    )
    assigned_to    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_policies'
    )

    # ── Client info ───────────────────────────────────────────────────────────
    client_name        = models.CharField(max_length=200)
    client_email       = models.EmailField()
    client_phone       = models.CharField(max_length=30)
    client_national_id = models.CharField(max_length=50)
    client_dob         = models.DateField(null=True, blank=True)
    client_address     = models.TextField(blank=True)

    # ── Policy details ────────────────────────────────────────────────────────
    coverage_type      = models.CharField(max_length=20, choices=CoverageType.choices)
    coverage_amount    = models.DecimalField(max_digits=14, decimal_places=2)
    premium_amount     = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    start_date         = models.DateField(null=True, blank=True)
    end_date           = models.DateField(null=True, blank=True)
    risk_level         = models.CharField(
        max_length=10,
        choices=[('low','Low'),('medium','Medium'),('high','High')],
        blank=True
    )
    notes              = models.TextField(blank=True)

    # ── Status ────────────────────────────────────────────────────────────────
    status             = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)
    submitted_at       = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference_no} — {self.client_name} ({self.status})'

    def save(self, *args, **kwargs):
        if not self.reference_no:
            last = PolicyRequest.objects.order_by('-created_at').first()
            num  = (int(last.reference_no.split('-')[1]) + 1) if last and last.reference_no else 1
            self.reference_no = f'POL-{num:06d}'
        super().save(*args, **kwargs)

    # ── FSM helpers ───────────────────────────────────────────────────────────
    VALID_TRANSITIONS = {
        Status.DRAFT:        [Status.PENDING],
        Status.PENDING:      [Status.UNDER_REVIEW],
        Status.UNDER_REVIEW: [Status.APPROVED, Status.REJECTED, Status.MORE_INFO],
        Status.MORE_INFO:    [Status.PENDING],
        Status.APPROVED:     [],
        Status.REJECTED:     [],
    }

    def can_transition_to(self, new_status):
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def transition_to(self, new_status, user=None):
        from django.utils import timezone
        if not self.can_transition_to(new_status):
            raise ValueError(
                f"Cannot transition from '{self.status}' to '{new_status}'."
            )
        self.status = new_status
        if new_status == self.Status.PENDING:
            self.submitted_at = timezone.now()
        self.save()


class UnderwriterReview(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    policy        = models.ForeignKey(PolicyRequest, on_delete=models.CASCADE, related_name='reviews')
    reviewed_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    decision      = models.CharField(
        max_length=20,
        choices=[
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
            ('more_info', 'More Info Needed'),
        ]
    )
    notes         = models.TextField()
    premium_suggested = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    risk_assessment   = models.CharField(
        max_length=10,
        choices=[('low','Low'),('medium','Medium'),('high','High')],
        blank=True
    )
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Review on {self.policy.reference_no} by {self.reviewed_by.full_name}'


class PolicyDocument(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    policy     = models.ForeignKey(PolicyRequest, on_delete=models.CASCADE, related_name='documents')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    name       = models.CharField(max_length=200)
    file       = models.FileField(upload_to='policy_documents/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.policy.reference_no})'
