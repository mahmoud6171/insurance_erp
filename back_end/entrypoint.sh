#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL..."
until python -c "
import dj_database_url, psycopg2
from decouple import config
p = dj_database_url.parse(config('DATABASE_URL'))
psycopg2.connect(host=p['HOST'], port=p['PORT'] or 5432, dbname=p['NAME'], user=p['USER'], password=p['PASSWORD'])
" 2>/dev/null; do sleep 1; done
echo "==> PostgreSQL ready."

echo "==> Waiting for Redis..."
until python -c "
import redis
from decouple import config
redis.from_url(config('REDIS_URL', default='redis://redis:6379/0')).ping()
" 2>/dev/null; do sleep 1; done
echo "==> Redis ready."

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Seeding users..."
python manage.py shell << 'PYEOF'
from django.contrib.auth import get_user_model
User = get_user_model()
seed = [
    dict(email='admin@erp.com',        fn='Admin',  ln='User',    role='admin',       pw='Admin@1234', staff=True),
    dict(email='employee@erp.com',     fn='Sara',   ln='Ahmed',   role='employee',    pw='Test@1234',  staff=False),
    dict(email='underwriter@erp.com',  fn='Khaled', ln='Hassan',  role='underwriter', pw='Test@1234',  staff=False),
    dict(email='ops@erp.com',          fn='Mona',   ln='Ibrahim', role='ops_manager', pw='Test@1234',  staff=False),
]
for u in seed:
    obj, created = User.objects.get_or_create(
        email=u['email'],
        defaults=dict(first_name=u['fn'], last_name=u['ln'], role=u['role'],
                      is_staff=u['staff'], is_superuser=u['staff'])
    )
    if created:
        obj.set_password(u['pw'])
        obj.save()
        print(f"  Created {obj.email}")
    else:
        print(f"  Exists  {obj.email}")
PYEOF

echo "==> Starting SERVICE_ROLE=${SERVICE_ROLE}"
case "$SERVICE_ROLE" in
  web)    exec daphne -b 0.0.0.0 -p 8000 config.asgi:application ;;
  worker) exec celery -A config worker -l info --concurrency=4 ;;
  beat)   exec celery -A config beat   -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler ;;
  *)      echo "Unknown SERVICE_ROLE: $SERVICE_ROLE" && exit 1 ;;
esac
