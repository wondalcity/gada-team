# GADA Hiring Platform

GADA is a construction industry hiring platform that connects workers, teams, and employers across South Korea. It supports individual workers, crew teams, and corporate employers through a unified job marketplace with multilingual support (Korean, Vietnamese, English).

---

## Architecture

```
gada-hiring/
├── apps/
│   ├── web/          Next.js 15 — worker/employer-facing PWA
│   ├── admin/        Next.js 15 — internal operations console
│   └── api/          Spring Boot (Kotlin) — REST API
├── packages/
│   ├── config/       Shared Tailwind, ESLint, Prettier, tsconfig
│   ├── types/        Shared TypeScript domain types (@gada/types)
│   └── ui/           Shared React component library (@gada/ui)
└── docker-compose.local.yml
```

```
┌─────────────────────────────────────┐
│           Browser / Mobile          │
└────────┬──────────────┬─────────────┘
         │              │
    ┌────▼────┐    ┌────▼────┐
    │  web    │    │  admin  │
    │ :3000   │    │  :3001  │
    └────┬────┘    └────┬────┘
         │              │
         └──────┬───────┘
                │ /api/*  (rewrite)
           ┌────▼────┐
           │   api   │
           │  :8090  │
           └────┬────┘
                │
     ┌──────────┼──────────┐
     │          │          │
┌────▼───┐ ┌───▼────┐ ┌───▼───┐
│Postgres│ │ Redis  │ │  S3   │
│ :5436  │ │ :6380  │ │       │
└────────┘ └────────┘ └───────┘
```

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Web Frontend | Next.js 15, React 19, Tailwind CSS  |
| Admin        | Next.js 15, React 19, Tailwind CSS  |
| API          | Spring Boot 3, Kotlin, Gradle       |
| Database     | PostgreSQL 16                       |
| Cache        | Redis 7                             |
| UI Library   | @gada/ui (CVA + Tailwind)           |
| Forms        | React Hook Form + Zod               |
| Data Fetch   | TanStack Query v5                   |
| Auth         | Firebase Phone Auth (web) + JWT (API) |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm@9` |
| JDK | 21 | `brew install openjdk@21` |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> gada-hiring
cd gada-hiring
pnpm install

# 2. Start infrastructure (Postgres :5436, Redis :6380)
docker compose -f docker-compose.local.yml up -d

# 3. Configure environment
cp apps/web/.env.local.example apps/web/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
# Edit apps/web/.env.local with your Firebase credentials (see "Local Authentication" below)

# 4. Start API (first run downloads Gradle wrapper, ~2-3 min)
make dev-api    # Spring Boot on :8090 — Flyway migrations run automatically

# 5. Start frontends (separate terminals)
make dev-web    # Next.js worker app on :3000
make dev-admin  # Next.js admin on :3001
```

For the full step-by-step runbook including common issues, see [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md).

---

## Local Authentication

`apps/web` uses Firebase phone authentication. For local API development and testing without a Firebase project, the local Spring profile enables a dev auth bypass via a request header.

### X-Dev-User-Id Header

Add `X-Dev-User-Id: {userId}` to any API request to authenticate as that user. This header is **only active** when the API runs with `--spring.profiles.active=local` (the default for `make dev-api`).

After running `make seed`, the following test users are available:

| ID | Phone | Role | Note |
|----|-------|------|------|
| 1  | +82-10-1001-0001 | WORKER | Korean worker (H2 visa) |
| 2  | +82-10-1002-0002 | WORKER | Vietnamese worker (E9 visa) |
| 3  | +82-10-1003-0003 | TEAM_LEADER | Leads a concrete crew |
| 4  | +82-10-2001-0001 | EMPLOYER | Company owner |
| 5  | +82-10-9001-0001 | ADMIN | Super admin |

---

## Seed Data

```bash
make seed        # Load test accounts, companies, sites, jobs
make seed-check  # Verify seed was loaded (lists users + roles)
```

Seed is idempotent — safe to run multiple times. If you wipe the DB, run `make reset-db` then `make seed`.

---

## Useful URLs

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Worker/employer web app |
| http://localhost:3001 | Admin console |
| http://localhost:8090 | API (Spring Boot) |
| http://localhost:8090/swagger-ui.html | Interactive API documentation |
| http://localhost:8090/api/v1/health | Health check endpoint |
| http://localhost:5436 | PostgreSQL (user: `gada`, pass: `gada_dev_pass`, db: `gada_hiring`) |
| http://localhost:6380 | Redis |

---

## Make Targets

| Command | Description |
|---------|-------------|
| `make setup` | One-time bootstrap (install + start infra) |
| `make dev-db` | Start Postgres + Redis only |
| `make dev-api` | Start Spring Boot API on :8090 |
| `make dev-web` | Start worker web app on :3000 |
| `make dev-admin` | Start admin console on :3001 |
| `make seed` | Load local test data into the database |
| `make seed-check` | Print user table to verify seed loaded |
| `make reset-db` | Wipe volumes + restart DB (Flyway re-runs on next API start) |
| `make stop` | Stop all Docker services |
| `make health` | Check API health endpoint |
| `make build-api` | Build API JAR (production) |
| `make build-web` | Build web app for production |
| `make test-smoke` | Run quick smoke tests against running stack |

---

## API Dev Auth Header

Use `X-Dev-User-Id` to test API endpoints with curl without Firebase:

```bash
# Health check (no auth required)
curl http://localhost:8090/api/v1/health

# As a worker — view my applications
curl -H "X-Dev-User-Id: 1" http://localhost:8090/api/v1/applications/mine

# As an employer — view received applications
curl -H "X-Dev-User-Id: 4" http://localhost:8090/api/v1/employer/applications

# As admin — list all workers
curl -H "X-Dev-User-Id: 5" http://localhost:8090/api/v1/admin/workers

# Public job listings (no auth)
curl "http://localhost:8090/api/v1/jobs?page=0&size=5"
```

Swagger UI at http://localhost:8090/swagger-ui.html also accepts the header via the "Authorize" dialog.

---

## Database Migrations

Flyway runs automatically on every API startup. Migrations live in `apps/api/src/main/resources/db/migration/` and are applied in order:

| Version | Description |
|---------|-------------|
| V1 | Initial schema (users, companies, sites, jobs) |
| V2 | Worker profiles + visa types |
| V3 | Applications + ATS states |
| V4 | Teams + team memberships |
| V5 | Contracts |
| V6 | Notifications |
| V7 | SMS templates |
| V8 | Admin roles |
| V9 | Audit log |

If a migration fails (e.g., after changing a migration file), run `make reset-db` to wipe and re-apply from V1.

---

## Project Structure

```
gada-hiring/
├── apps/
│   ├── web/                  # Worker/employer Next.js PWA
│   │   ├── app/              # App router pages
│   │   ├── components/       # Page-level components
│   │   └── .env.local.example
│   ├── admin/                # Internal ops console
│   │   ├── app/              # App router pages
│   │   ├── components/       # Admin UI components
│   │   └── .env.local.example
│   └── api/                  # Spring Boot (Kotlin)
│       └── src/main/
│           ├── kotlin/com/gada/  # Controllers, services, repos
│           └── resources/
│               ├── application.yml
│               ├── application-local.yml
│               └── db/
│                   ├── migration/   # Flyway V1-V9
│                   └── seed-local.sql
├── packages/
│   ├── config/               # Shared TS/ESLint/Tailwind configs
│   ├── types/                # @gada/types — domain type definitions
│   └── ui/                   # @gada/ui — shared React components
├── docs/
│   ├── LOCAL_DEV.md          # Full developer runbook
│   ├── QA_CHECKLIST.md       # Manual QA test cases
│   └── RESPONSIVE_QA.md      # Responsive design QA
├── docker-compose.local.yml
└── Makefile
```

---

## QA & Testing

- [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) — Manual QA test cases covering auth, onboarding, job search, applications, admin flows
- [docs/RESPONSIVE_QA.md](docs/RESPONSIVE_QA.md) — Responsive design and mobile QA matrix

To run the automated smoke test suite against a running stack:

```bash
make test-smoke
```

---

## Brand

- Primary blue: `#0669F7`
- Accent yellow: `#FFC72C`
- Font: Pretendard Variable
- Style: construction-tech SaaS — bold, practical, high-contrast
