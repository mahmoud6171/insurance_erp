import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('role', User.Role.ADMIN)
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        EMPLOYEE     = 'employee',     'Employee'
        UNDERWRITER  = 'underwriter',  'Underwriter'
        OPS_MANAGER  = 'ops_manager',  'Operations Manager'
        ADMIN        = 'admin',        'Admin'

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    role       = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    department = models.CharField(max_length=100, blank=True)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f'{self.full_name} ({self.role})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    # ── Role helpers ──────────────────────────────────────────────────────────
    @property
    def is_employee(self):
        return self.role == self.Role.EMPLOYEE

    @property
    def is_underwriter(self):
        return self.role == self.Role.UNDERWRITER

    @property
    def is_ops_manager(self):
        return self.role == self.Role.OPS_MANAGER

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN
