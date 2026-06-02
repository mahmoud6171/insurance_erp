.PHONY: help up down build logs shell-backend shell-db ps clean reset

COMPOSE = docker compose -f docker-compose.yml --env-file .env

help:   ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

up:     ## Start all services (detached)
	$(COMPOSE) up -d

down:   ## Stop all services
	$(COMPOSE) down

build:  ## Build / rebuild images
	$(COMPOSE) build --no-cache

logs:   ## Tail logs for all services
	$(COMPOSE) logs -f

logs-backend: ## Tail Django logs
	$(COMPOSE) logs -f backend

logs-worker:  ## Tail Celery worker logs
	$(COMPOSE) logs -f celery-worker

logs-beat:    ## Tail Celery beat logs
	$(COMPOSE) logs -f celery-beat

ps:     ## Show running containers
	$(COMPOSE) ps

shell-backend: ## Open Django shell
	$(COMPOSE) exec backend python manage.py shell

shell-db:      ## Open psql shell
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-erp} -d $${POSTGRES_DB:-insurance_erp}

migrate:       ## Run Django migrations
	$(COMPOSE) exec backend python manage.py migrate

createsuperuser: ## Create Django superuser
	$(COMPOSE) exec backend python manage.py createsuperuser

clean:  ## Remove containers and volumes (keeps images)
	$(COMPOSE) down -v

reset:  ## Full reset — remove everything including images
	$(COMPOSE) down -v --rmi all
