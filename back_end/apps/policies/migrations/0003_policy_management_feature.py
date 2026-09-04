# Generated for Policy Management feature (T010)

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('policies', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='policyrequest',
            name='version',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='policyrequest',
            name='renewal_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='policyrequest',
            name='requires_approval',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='Beneficiary',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('full_name', models.CharField(max_length=200)),
                ('relationship', models.CharField(max_length=50)),
                ('benefit_percentage', models.DecimalField(decimal_places=2, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('policy', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='beneficiaries', to='policies.policyrequest')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='CoverageItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('limit', models.DecimalField(decimal_places=2, max_digits=14)),
                ('deductible', models.DecimalField(decimal_places=2, default=0.0, max_digits=14)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('policy', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='coverage_items', to='policies.policyrequest')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='PolicyAuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action', models.CharField(max_length=50)),
                ('diff', models.JSONField(blank=True, default=dict)),
                ('trace_id', models.CharField(blank=True, max_length=36)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                ('policy', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='policies.policyrequest')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='policyrequest',
            index=models.Index(fields=['status', 'submitted_at'], name='policy_status_submitted_idx'),
        ),
        migrations.AddIndex(
            model_name='policyrequest',
            index=models.Index(fields=['client_name'], name='policy_client_name_idx'),
        ),
        migrations.AddIndex(
            model_name='policyrequest',
            index=models.Index(fields=['renewal_date'], name='policy_renewal_date_idx'),
        ),
        migrations.AddIndex(
            model_name='policyauditlog',
            index=models.Index(fields=['policy', 'created_at'], name='policy_audit_policy_created_idx'),
        ),
    ]
