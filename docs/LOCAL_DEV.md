# Local Development Guide

## First-Time Setup

### Prerequisites

| Tool | Min Version | Check | Install |
|------|-------------|-------|---------|
| Node.js | 20 | `node --version` | https://nodejs.org |
| pnpm | 9 | `pnpm --version` | `npm i -g pnpm@9` |
| JDK | 21 | `java --version` | `brew install openjdk@21` |
| Docker Desktop | any | `docker ps` | https://www.docker.com/products/docker-desktop |

JDK path on Apple Silicon Macs:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
```

Add the above to your `~/.zshrc` or `~/.bash_profile` to persist across sessions. The `Makefile` sets `JAVA_HOME` automatically for `make dev-api` and `make build-api`.

---

### Step-by-step

```bash
# 1. Install Node dependencies
pnpm install

# 2. Start infrastructure (Postgres :5436, Redis :6380)
docker compose -f docker-compose.local.yml up -d

# 3. Wait for Postgres to accept connections
until docker exec gada-hiring-postgres pg_isready -U gada -d gada_hiring; do sleep 1; done

# 4. Set up env files
cp apps/web/.env.local.example apps/web/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local

# 5. (Optional) Add Firebase credentials to apps/web/.env.local
# Without Firebase: phone auth UI won't work, but the API and admin console work fine

# 6. Start API (first run downloads the Gradle wrapper — may take 2-3 min)
make dev-api
# → Flyway automatically runs migrations V1-V9
# → API is ready at http://localhost:8090

# 7. Load seed data (open a new terminal, after API has started)
make seed

# 8. Start frontends (each in its own terminal)
make dev-web    # :3000
make dev-admin  # :3001
```

After all services are running, confirm the stack is healthy:

```bash
make test-smoke
```

---

## Testing API Without Firebase

The local Spring profile (`application-local.yml`) enables a dev auth bypass. The API reads the `X-Dev-User-Id` header and treats it as the authenticated user ID. The header is **ignored in non-local profiles**.

```bash
# As worker (ID 1)
curl -H "X-Dev-User-Id: 1" http://localhost:8090/api/v1/applications/mine

# As employer (ID 4)
curl -H "X-Dev-User-Id: 4" http://localhost:8090/api/v1/employer/applications

# As admin (ID 5)
curl -H "X-Dev-User-Id: 5" http://localhost:8090/api/v1/admin/workers

# Health check (no auth required)
curl http://localhost:8090/api/v1/health | python3 -m json.tool
```

You can also use the Swagger UI at http://localhost:8090/swagger-ui.html — click "Authorize" and enter `X-Dev-User-Id: 5` to test admin endpoints interactively.

---

## Smoke Test Sequence

Run these manually after initial setup to verify the full stack is wired together:

```bash
# 1. Health check
curl http://localhost:8090/api/v1/health

# 2. Public job list (no auth)
curl "http://localhost:8090/api/v1/jobs?page=0&size=5" | python3 -m json.tool

# 3. Public categories
curl http://localhost:8090/api/v1/categories?locale=ko | python3 -m json.tool

# 4. Worker's applications (dev auth)
curl -H "X-Dev-User-Id: 1" http://localhost:8090/api/v1/applications/mine | python3 -m json.tool

# 5. Admin workers list
curl -H "X-Dev-User-Id: 5" http://localhost:8090/api/v1/admin/workers | python3 -m json.tool

# 6. Admin SMS templates
curl -H "X-Dev-User-Id: 5" http://localhost:8090/api/v1/admin/sms-templates | python3 -m json.tool
```

Or run the automated version:

```bash
make test-smoke
```

---

## Firebase Setup (for phone auth)

Phone authentication in `apps/web` requires a real Firebase project or the Firebase local emulator. Without it, the API and admin console still work fine using `X-Dev-User-Id`.

### Real Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project (or use an existing one)
3. Go to Authentication → Sign-in methods → Enable **Phone**
4. Go to Project Settings → Your apps → Add app → Web → Copy the config object
5. Paste the values into `apps/web/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

6. In Firebase Console → Authentication → Settings → Authorized domains, add `localhost`

### Test phone numbers (Firebase)

To avoid real SMS costs during development, add test numbers in Firebase:

Firebase Console → Authentication → Sign-in methods → Phone → **Test phone numbers**

| Phone Number | Test OTP |
|-------------|----------|
| +82-10-1001-0001 | 123456 |
| +82-10-2001-0001 | 123456 |
| +82-10-9001-0001 | 123456 |

---

## Seed Data

The seed script is at `apps/api/src/main/resources/db/seed-local.sql`. It is idempotent (uses `ON CONFLICT DO NOTHING`).

```bash
make seed        # Load test accounts, companies, sites, jobs
make seed-check  # Prints users table to verify load
```

Seed accounts created:

| ID | Phone | Role | Notes |
|----|-------|------|-------|
| 1 | +82-10-1001-0001 | WORKER | Korean worker, H2 visa |
| 2 | +82-10-1002-0002 | WORKER | Vietnamese worker, E9 visa |
| 3 | +82-10-1003-0003 | TEAM_LEADER | Leads a concrete crew |
| 4 | +82-10-2001-0001 | EMPLOYER | Company owner |
| 5 | +82-10-9001-0001 | ADMIN | Super admin |

---

## Database Reset

Wipes all data and Docker volumes, then restarts a clean database:

```bash
make reset-db    # Removes postgres + redis volumes, restarts containers
# Then restart the API — Flyway re-runs all migrations from V1
make dev-api
make seed        # Re-load seed data
```

Use this when:
- A migration file was changed after it had already been applied
- You want a clean slate for testing
- Flyway throws a validation or checksum error

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Port 5436 already in use | Another Postgres running on that port | `docker ps` to identify conflict; stop it, or change the port mapping in `docker-compose.local.yml` |
| `JAVA_HOME not set` or `java: command not found` | JDK 21 not on PATH | `export JAVA_HOME=/opt/homebrew/opt/openjdk@21` then re-run |
| Flyway validation error / checksum mismatch | A migration file was edited after being applied | `make reset-db` to wipe and re-apply all migrations |
| `Connection refused` when calling API | API is not running | Open a terminal and run `make dev-api` |
| Firebase `auth/invalid-api-key` | Wrong or missing values in `.env.local` | Use a real Firebase config, or skip Firebase and test with `X-Dev-User-Id` |
| Admin console shows no data | Seed not loaded | Run `make seed` (API must be running first) |
| `pnpm: command not found` | pnpm not installed | `npm i -g pnpm@9` |
| Gradle download hangs | First-time wrapper download | Wait ~2 min on a fresh clone; check internet connectivity |
| `compileKotlin` fails | Incompatible JDK version | Confirm `java --version` shows 21; set `JAVA_HOME` correctly |

---

## Port Reference

| Service | Port | Notes |
|---------|------|-------|
| web (worker/employer) | 3000 | Next.js dev server |
| admin | 3001 | Next.js dev server |
| API | 8090 | Spring Boot |
| PostgreSQL | 5436 | Mapped from container :5432 |
| Redis | 6380 | Mapped from container :6379 |
| MailHog SMTP | 1025 | Profile `mail` only |
| MailHog Web UI | 8025 | Profile `mail` only |

To start MailHog (email capture for local testing):

```bash
docker compose -f docker-compose.local.yml --profile mail up -d
```

---

## Makefile Reference

```
make setup        One-time bootstrap: pnpm install + start infra + wait for Postgres
make dev-db       Start Postgres + Redis only
make dev-api      Start Spring Boot API (local profile, port 8090)
make dev-web      Start worker web app (port 3000)
make dev-admin    Start admin console (port 3001)
make seed         Load test data from seed-local.sql
make seed-check   Print users table to verify seed loaded
make reset-db     Wipe DB volumes + restart containers
make stop         Stop all Docker services
make logs         Tail Docker logs
make health       curl the /api/v1/health endpoint
make build-api    Build API JAR (production, --no-daemon)
make build-web    Build web for production (pnpm build)
make test-smoke   Run automated smoke tests against running stack
```
