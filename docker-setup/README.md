# InsureFlow ERP — Docker Setup

Single-command deployment for the full stack:

```
PostgreSQL 16 + Redis 7 + Django/Daphne + Celery Worker + Celery Beat + React/Nginx
```

---

## Prerequisites

- Docker ≥ 24.0
- Docker Compose ≥ 2.20 (`docker compose` v2, not `docker-compose`)

---

## Project layout expected

```
parent-folder/
├── docker-setup/          ← this folder
│   ├── docker-compose.yml
│   ├── .env               ← copy from .env.example and fill in
│   ├── Makefile
│   └── README.md
├── insurance_erp/         ← Django backend
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── ...
└── insurance-erp-frontend/ ← React frontend
    ├── Dockerfile
    ├── nginx.conf
    └── ...
```

---

## Quick start

### 1. Configure environment
```bash
cd docker-setup
cp .env .env.local          # optional — .env is used by default
# Edit .env and change at minimum:
#   SECRET_KEY  ← generate with: python -c "import secrets; print(secrets.token_hex(50))"
#   EMAIL_HOST_USER / EMAIL_HOST_PASSWORD  ← optional, skip for local dev
```

### 2. Build & start
```bash
make build    # build all images (~2-3 min first time)
make up       # start all 6 services
```

Or without make:
```bash
docker compose -f docker-compose.yml --env-file .env up -d --build
```

### 3. Open the app
| Service      | URL                             |
|--------------|---------------------------------|
| Frontend     | http://localhost                |
| Django Admin | http://localhost/admin          |
| Backend API  | http://localhost/api            |

### 4. Test accounts (auto-seeded)
| Role        | Email                  | Password    |
|-------------|------------------------|-------------|
| Admin       | admin@erp.com          | Admin@1234  |
| Employee    | employee@erp.com       | Test@1234   |
| Underwriter | underwriter@erp.com    | Test@1234   |
| Ops Manager | ops@erp.com            | Test@1234   |

---

## Common commands

```bash
make logs              # tail all service logs
make logs-backend      # Django only
make logs-worker       # Celery worker only
make logs-beat         # Celery beat only
make ps                # see container status
make shell-backend     # Django manage.py shell
make shell-db          # psql into postgres
make migrate           # run migrations manually
make down              # stop everything
make clean             # stop + remove volumes
make reset             # full wipe including images
```

---

## Service architecture

```
Browser
   │
   ▼
Nginx :80  (frontend container)
   ├── /            → serves React SPA (static files)
   ├── /api/*       → proxy → backend:8000 (Django REST)
   ├── /admin/*     → proxy → backend:8000 (Django Admin)
   ├── /static/*    → proxy → backend:8000 (WhiteNoise)
   ├── /media/*     → proxy → backend:8000 (uploads)
   └── /ws/*        → proxy → backend:8000 (WebSocket / Channels)
         │
         ▼
   backend:8000 (Daphne ASGI)
         │
    ┌────┴──────────────────────┐
    │                           │
    ▼                           ▼
PostgreSQL:5432           Redis:6379
(persistent data)    (channel layer + celery broker)
                           │
                    ┌──────┴──────────┐
                    ▼                 ▼
             celery-worker      celery-beat
           (email + WS push)  (scheduled jobs)
```

---

## Volumes

| Volume         | Contents                         |
|----------------|----------------------------------|
| `postgres-data`| PostgreSQL database files        |
| `redis-data`   | Redis AOF persistence            |
| `media-files`  | Uploaded policy documents        |
| `static-files` | Collected Django static assets   |

All volumes survive `make down`. Only `make clean` removes them.

---

## Scheduled jobs (Celery Beat)

| Job                        | Schedule         | Description                                           |
|----------------------------|------------------|-------------------------------------------------------|
| `remind_stale_pending`     | Daily @ 8 AM UTC | Notifies underwriters about policies pending > 24 hrs |
| `notify_expiring_policies` | Daily @ 9 AM UTC | Alerts employees about policies expiring in ≤ 30 days |
| `send_weekly_task_digest`  | Mon  @ 8 AM UTC  | Sends ops managers a summary of open/overdue tasks    |

Schedules are stored in the DB — edit them at `http://localhost/admin/django_celery_beat/periodictask/`.

---

## Environment variables reference

| Variable               | Default                     | Description                        |
|------------------------|-----------------------------|------------------------------------|
| `SECRET_KEY`           | *(required in prod)*        | Django secret key                  |
| `DEBUG`                | `False`                     | Enable Django debug mode           |
| `POSTGRES_DB`          | `insurance_erp`             | DB name                            |
| `POSTGRES_USER`        | `erp`                       | DB user                            |
| `POSTGRES_PASSWORD`    | `erppass`                   | DB password                        |
| `CORS_ALLOWED_ORIGINS` | `http://localhost`          | Comma-separated allowed origins    |
| `FRONTEND_PORT`        | `80`                        | Host port for Nginx                |
| `EMAIL_HOST_USER`      | *(empty)*                   | SMTP user (optional for local dev) |
| `EMAIL_HOST_PASSWORD`  | *(empty)*                   | SMTP password                      |

---

## Production checklist

- [ ] Change `SECRET_KEY` to a 50+ char random string
- [ ] Set `DEBUG=False`
- [ ] Use strong `POSTGRES_PASSWORD`
- [ ] Set `CORS_ALLOWED_ORIGINS` to your real domain
- [ ] Configure real SMTP credentials for email delivery
- [ ] Add a volume backup cron for `postgres-data`
- [ ] Put Nginx behind a TLS terminating load balancer / Cloudflare
