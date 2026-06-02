"""Quick seed — run with: python manage.py shell < seed.py"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

users = [
    dict(email='admin@erp.com',       first_name='Admin',   last_name='User',      role='admin',       password='Admin@1234'),
    dict(email='employee@erp.com',     first_name='Sara',    last_name='Ahmed',     role='employee',    password='Test@1234'),
    dict(email='underwriter@erp.com',  first_name='Khaled',  last_name='Hassan',    role='underwriter', password='Test@1234'),
    dict(email='ops@erp.com',          first_name='Mona',    last_name='Ibrahim',   role='ops_manager', password='Test@1234'),
]

for u in users:
    pwd = u.pop('password')
    obj, created = User.objects.get_or_create(email=u['email'], defaults=u)
    if created:
        obj.set_password(pwd)
        if u.get('role') == 'admin':
            obj.is_staff = obj.is_superuser = True
        obj.save()
        print(f'  Created: {obj.email}  ({obj.role})')
    else:
        print(f'  Exists:  {obj.email}')

print('\n✓ Seed complete')
