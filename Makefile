.PHONY: setup dev-db dev-api dev-web stop reset-db logs health dev-admin seed seed-check dev-all test-smoke

# JDK 21 via Homebrew (required for Spring Boot compilation)
JAVA_HOME ?= /opt/homebrew/opt/openjdk@21
export JAVA_HOME
export PATH := $(JAVA_HOME)/bin:$(PATH)

# ─────────────────────────────────────────────────────────────
# Bootstrap
# ─────────────────────────────────────────────────────────────

setup:
	pnpm install
	docker compose up -d
	@echo "Waiting for postgres to be ready..."
	@until docker exec gada-hiring-postgres pg_isready -U gada -d gada_hiring > /dev/null 2>&1; do sleep 1; done
	@echo ""
	@echo "Setup complete."
	@echo ""
	@echo "  API:  make dev-api   (http://localhost:8090)"
	@echo "  Web:  make dev-web   (http://localhost:3000)"
	@echo "  Docs: http://localhost:8090/swagger-ui.html"

# ─────────────────────────────────────────────────────────────
# Services
# ─────────────────────────────────────────────────────────────

dev-db:
	docker compose up -d postgres redis

dev-api:
	cd apps/api && chmod +x gradlew && ./gradlew bootRun --args='--spring.profiles.active=local'

dev-web:
	pnpm --filter web dev

dev-admin:
	pnpm --filter admin dev

# ─────────────────────────────────────────────────────────────
# Infra management
# ─────────────────────────────────────────────────────────────

stop:
	docker compose down

reset-db:
	docker compose down -v
	docker compose up -d postgres redis
	@echo "Waiting for postgres..."
	@until docker exec gada-hiring-postgres pg_isready -U gada -d gada_hiring > /dev/null 2>&1; do sleep 1; done
	@echo "DB reset complete."

logs:
	docker compose logs -f

health:
	@curl -s http://localhost:8090/api/v1/health | python3 -m json.tool 2>/dev/null || echo "API not running"

seed:
	docker exec -i gada-hiring-postgres psql -U gada -d gada_hiring < apps/api/src/main/resources/db/seed-local.sql
	@echo "Seed data loaded."

seed-check:
	docker exec gada-hiring-postgres psql -U gada -d gada_hiring -c "SELECT phone, role, status FROM users ORDER BY id;"

dev-all:
	@echo "Start these in separate terminals:"
	@echo "  Terminal 1: make dev-db"
	@echo "  Terminal 2: make dev-api"
	@echo "  Terminal 3: make dev-web"
	@echo "  Terminal 4: make dev-admin"

# ─────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────

build-api:
	cd apps/api && ./gradlew build --no-daemon

build-web:
	pnpm --filter web build

# ─────────────────────────────────────────────────────────────
# Smoke Tests
# ─────────────────────────────────────────────────────────────

test-smoke:
	@echo "=== GADA Smoke Tests ==="
	@echo "1. Health check..."
	@curl -sf http://localhost:8090/api/v1/health > /dev/null && echo "   ✓ API healthy" || echo "   ✗ API not running"
	@echo "2. Public jobs..."
	@curl -sf "http://localhost:8090/api/v1/jobs?page=0&size=1" > /dev/null && echo "   ✓ Jobs endpoint OK" || echo "   ✗ Jobs endpoint failed"
	@echo "3. Categories..."
	@curl -sf "http://localhost:8090/api/v1/categories?locale=ko" > /dev/null && echo "   ✓ Categories OK" || echo "   ✗ Categories failed"
	@echo "4. Admin workers (dev auth)..."
	@curl -sf -H "X-Dev-User-Id: 5" "http://localhost:8090/api/v1/admin/workers" > /dev/null && echo "   ✓ Admin auth OK" || echo "   ✗ Admin auth failed"
	@echo "=== Done ==="
