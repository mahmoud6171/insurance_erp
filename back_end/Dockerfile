# ── Stage 1: Build deps ───────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev libjpeg-dev libpng-dev libwebp-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 libjpeg62-turbo libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --chown=appuser:appgroup . .

RUN mkdir -p /app/media /app/staticfiles && \
    chown -R appuser:appgroup /app/media /app/staticfiles

RUN chmod +x /app/entrypoint.sh

# Collect static at build time
RUN SECRET_KEY=build-placeholder DEBUG=False \
    DATABASE_URL=sqlite:////tmp/build.db \
    python manage.py collectstatic --noinput

USER appuser

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
