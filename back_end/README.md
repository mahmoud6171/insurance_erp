# Insurance Mini ERP — Django Backend

## Stack
| Layer | Tech |
|---|---|
| API | Django 4.2 + Django REST Framework |
| Auth | JWT (SimpleJWT) — access (1h) + refresh (7d) with blacklist |
| Real-time | Django Channels 4 + Redis channel layer |
| Background | Celery 5 + Redis broker |
| Email | SMTP / SendGrid via Celery tasks |
| DB | SQLite (dev) → PostgreSQL (prod) |

---

## Project structure
```
insurance_erp/
├── apps/
│   ├── users/          # Custom user model, JWT, role permissions
│   ├── policies/       # PolicyRequest FSM, UnderwriterReview
│   ├── operations/     # OperationTask, TaskComment
│   └── notifications/  # Notification model, WS consumer, Celery tasks
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py         # ASGI + Channels routing
│   └── celery.py
├── .env
├── seed.py
└── requirements.txt
```

---

## Quick start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure .env
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3          # or postgres://user:pass@host/db
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your@email.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 3. Run migrations & seed
```bash
python manage.py migrate
python manage.py shell < seed.py
```

### 4. Start services (3 terminals)

**Terminal 1 — Django (ASGI)**
```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
# or for dev: python manage.py runserver  (HTTP only, no WS)
```

**Terminal 2 — Celery worker**
```bash
celery -A config worker -l info
```

**Terminal 3 — Redis** (if not running)
```bash
redis-server
```

---

## Seed accounts
| Email | Password | Role |
|---|---|---|
| admin@erp.com | Admin@1234 | Admin |
| employee@erp.com | Test@1234 | Employee |
| underwriter@erp.com | Test@1234 | Underwriter |
| ops@erp.com | Test@1234 | Ops Manager |

---

## API Reference

### Auth
| Method | URL | Description |
|---|---|---|
| POST | `/api/auth/login/` | Login → returns `access`, `refresh`, `user` |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Blacklist refresh token |
| GET/PATCH | `/api/auth/me/` | Current user profile |
| POST | `/api/auth/change-password/` | Change password |
| POST | `/api/auth/register/` | Create user (admin only) |
| GET | `/api/auth/users/` | List all users (admin only) |
| GET | `/api/auth/users/underwriters/` | List underwriters |

### Policies
| Method | URL | Permission | Description |
|---|---|---|---|
| GET | `/api/policies/` | All | List (employees see own, underwriters see all) |
| POST | `/api/policies/` | Employee | Create draft |
| GET | `/api/policies/<id>/` | Owner/Underwriter | Detail with reviews |
| POST | `/api/policies/<id>/submit/` | Owner | Submit draft → pending |
| POST | `/api/policies/<id>/take/` | Underwriter | Claim → under_review |
| POST | `/api/policies/<id>/review/` | Underwriter | Submit decision |
| GET | `/api/policies/summary/` | All | Status counts |

**Review payload:**
```json
{
  "decision": "approved|rejected|more_info",
  "notes": "Risk assessment details...",
  "premium_suggested": 5000.00,
  "risk_assessment": "medium"
}
```

### Operations
| Method | URL | Description |
|---|---|---|
| GET | `/api/operations/tasks/` | List tasks (filtered by role) |
| POST | `/api/operations/tasks/` | Create task |
| PATCH | `/api/operations/tasks/<id>/` | Update task |
| POST | `/api/operations/tasks/<id>/complete/` | Mark done |
| POST | `/api/operations/tasks/<id>/comments/` | Add comment |
| GET | `/api/operations/tasks/my-tasks/` | My open tasks |
| GET | `/api/operations/tasks/summary/` | Status counts |

### Notifications
| Method | URL | Description |
|---|---|---|
| GET | `/api/notifications/` | List (add `?unread=true`) |
| GET | `/api/notifications/unread-count/` | `{"unread": N}` |
| POST | `/api/notifications/mark-all-read/` | Mark all read |
| POST | `/api/notifications/<id>/read/` | Mark one read |

---

## WebSocket

**Connect:**
```
ws://localhost:8000/ws/notifications/?token=<access_token>
```

**On connect — server sends:**
```json
{ "type": "connected", "unread": 3 }
```

**Live notification push:**
```json
{
  "type": "notification",
  "id": "uuid",
  "notif_type": "policy_submitted",
  "title": "New Policy Request: POL-000001",
  "message": "Sara Ahmed submitted a new Life Insurance policy...",
  "object_type": "policy",
  "object_id": "uuid",
  "created_at": "2025-01-01T10:00:00Z",
  "unread": 4
}
```

**Client can send:**
```json
{ "action": "mark_read",    "id": "<notification_uuid>" }
{ "action": "mark_all_read" }
```

---

## Real-time notification flow

```
Employee submits policy
       ↓
PolicyRequest.transition_to('pending')
       ↓
post_save signal fires
       ↓
Celery task: notify_policy_status_change
       ↓
  ┌────────────────────────┐
  │  For each underwriter: │
  │  1. Create Notification│
  │  2. channel_layer      │
  │     .group_send()      │  → WebSocket push (instant)
  │  3. send_mail()        │  → Email
  └────────────────────────┘
```

---

## Roles & permissions matrix

| Action | Employee | Underwriter | Ops Manager | Admin |
|---|:---:|:---:|:---:|:---:|
| Create policy request | ✓ | - | - | ✓ |
| Submit own policy | ✓ | - | - | ✓ |
| View all policies | - | ✓ | - | ✓ |
| Review / decide policy | - | ✓ | - | ✓ |
| Create/manage tasks | - | - | ✓ | ✓ |
| View assigned tasks | ✓ | ✓ | ✓ | ✓ |
| Manage users | - | - | - | ✓ |

---

## Policy status machine

```
DRAFT → PENDING → UNDER_REVIEW → APPROVED
                              ↘ REJECTED
                              ↘ MORE_INFO → PENDING (loop)
```
