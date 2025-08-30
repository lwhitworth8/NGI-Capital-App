.PHONY: help build up down logs shell test clean backup restore init dev prod

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER = docker
PROJECT_NAME = ngi-capital

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
NC = \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)NGI Capital Docker Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

# Development Commands
dev: ## Start development environment (hot reload)
	@echo "$(GREEN)Starting development environment (hot reload)...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up -d backend frontend
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "API: http://localhost:8001"
	@echo "Frontend: http://localhost:3001"

build: ## Build Docker images
	@echo "$(GREEN)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache

up: ## Start all services
	@echo "$(GREEN)Starting all services...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)All services started!$(NC)"

down: ## Stop all services
	@echo "$(YELLOW)Stopping all services...$(NC)"
	$(DOCKER_COMPOSE) down

restart: ## Restart all services
	@echo "$(YELLOW)Restarting all services...$(NC)"
	$(DOCKER_COMPOSE) restart

logs: ## View logs for all services
	$(DOCKER_COMPOSE) logs -f

logs-api: ## View API logs
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## View frontend logs
	$(DOCKER_COMPOSE) logs -f frontend

# Production Commands
prod: ## Start production environment with all services
	@echo "$(GREEN)Starting production environment...$(NC)"
	$(DOCKER_COMPOSE) --profile production up -d
	@echo "$(GREEN)Production environment started!$(NC)"

# Container Management
shell-api: ## Open shell in API container
	$(DOCKER) exec -it ngi-backend /bin/bash

shell-frontend: ## Open shell in frontend container
	$(DOCKER) exec -it ngi-frontend /bin/sh

shell-db: ## Open PostgreSQL shell
	$(DOCKER) exec -it ngi-postgres psql -U ngi_admin -d ngi_capital

# Database Commands
db-init: ## Initialize database
	@echo "$(GREEN)Initializing database...$(NC)"
	$(DOCKER) exec ngi-backend python init_db_simple.py
	@echo "$(GREEN)Database initialized!$(NC)"

db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	$(DOCKER) exec ngi-backend python scripts/migrate.py
	@echo "$(GREEN)Migrations complete!$(NC)"

db-backup: ## Backup database
	@echo "$(GREEN)Creating database backup...$(NC)"
	$(DOCKER) exec ngi-backend /bin/bash scripts/backup.sh
	@echo "$(GREEN)Backup complete!$(NC)"

db-restore: ## Restore database from latest backup
	@echo "$(YELLOW)Restoring database from latest backup...$(NC)"
	@read -p "This will overwrite the current database. Continue? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DOCKER) exec ngi-backend /bin/bash scripts/restore.sh; \
		echo "$(GREEN)Database restored!$(NC)"; \
	else \
		echo "$(RED)Restore cancelled.$(NC)"; \
	fi

# Testing
test: ## Run all tests
	@echo "$(GREEN)Running tests...$(NC)"
	$(DOCKER) exec ngi-backend pytest tests/
	@echo "$(GREEN)Tests complete!$(NC)"

test-api: ## Test API endpoints
	@echo "$(GREEN)Testing API endpoints...$(NC)"
	@curl -f http://localhost:8001/health || (echo "$(RED)API health check failed$(NC)" && exit 1)
	@echo "$(GREEN)API is healthy!$(NC)"

# Monitoring
status: ## Show status of all services
	@echo "$(GREEN)Service Status:$(NC)"
	$(DOCKER_COMPOSE) ps

stats: ## Show container statistics
	$(DOCKER) stats --no-stream

# Cleanup
clean: ## Clean up containers, volumes, and images
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	$(DOCKER_COMPOSE) down -v
	$(DOCKER) system prune -f
	@echo "$(GREEN)Cleanup complete!$(NC)"

clean-all: ## Deep clean including all images and volumes
	@echo "$(RED)This will remove ALL Docker resources for this project!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DOCKER_COMPOSE) down -v --rmi all; \
		$(DOCKER) system prune -af --volumes; \
		echo "$(GREEN)Deep cleanup complete!$(NC)"; \
	else \
		echo "$(YELLOW)Cleanup cancelled.$(NC)"; \
	fi

# Setup
init: ## Initial setup (build, create .env, init db)
	@echo "$(GREEN)Initializing NGI Capital application...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env file from template$(NC)"; \
	fi
	@$(MAKE) build
	@$(MAKE) up
	@sleep 5
	@$(MAKE) db-init
	@echo "$(GREEN)Initialization complete!$(NC)"
	@echo ""
	@echo "$(GREEN)Access the application at:$(NC)"
	@echo "  API: http://localhost:8001"
	@echo "  Frontend: http://localhost:3001"
	@echo ""
	@echo "$(GREEN)Login credentials:$(NC)"
	@echo "  Andre: anurmamade@ngicapitaladvisory.com / TempPassword123!"
	@echo "  Landon: lwhitworth@ngicapitaladvisory.com / TempPassword123!"

# Development helpers
watch: ## Watch logs in development
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml logs -f backend frontend

dev-down: ## Stop development environment
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml down

rebuild: ## Rebuild and restart services
	@echo "$(YELLOW)Rebuilding services...$(NC)"
	$(DOCKER_COMPOSE) down
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)Services rebuilt and restarted!$(NC)"

# Health checks
health: ## Check health of all services
	@echo "$(GREEN)Checking service health...$(NC)"
	@echo -n "API: "
	@curl -sf http://localhost:8001/health > /dev/null && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo -n "Frontend: "
	@curl -sf http://localhost:3001 > /dev/null && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@if [ $$($(DOCKER_COMPOSE) --profile production ps postgres 2>/dev/null | grep -c postgres) -gt 0 ]; then \
		echo -n "PostgreSQL: "; \
		$(DOCKER) exec ngi-postgres pg_isready > /dev/null 2>&1 && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"; \
	fi
	@if [ $$($(DOCKER_COMPOSE) --profile production ps redis 2>/dev/null | grep -c redis) -gt 0 ]; then \
		echo -n "Redis: "; \
		$(DOCKER) exec ngi-redis redis-cli ping > /dev/null 2>&1 && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"; \
	fi
