#!/usr/bin/env bash
# ================================================================
# GADA Team — Railway Deployment Script
# Run this AFTER `railway login` and `railway link` (or `railway init`)
# Usage: bash scripts/deploy-railway.sh
# ================================================================
set -euo pipefail

RAILWAY=$(which railway 2>/dev/null || echo "$HOME/.nvm/versions/node/v22.21.0/bin/railway")

echo "=== Checking Railway login ==="
"$RAILWAY" whoami || { echo "ERROR: Not logged in. Run: railway login"; exit 1; }

echo ""
echo "=== Setting environment variables ==="

# ── Spring Boot ──────────────────────────────────────────────────
"$RAILWAY" variables set SPRING_PROFILES_ACTIVE="prod,no-redis"
"$RAILWAY" variables set SERVER_PORT="8090"

# ── Database (Supabase) ──────────────────────────────────────────
"$RAILWAY" variables set DB_URL="jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
"$RAILWAY" variables set DB_USERNAME="postgres.lkxpsfanubygalhdqksz"
"$RAILWAY" variables set DB_PASSWORD="dnjsduq0717^^"
"$RAILWAY" variables set DB_POOL_SIZE="3"
"$RAILWAY" variables set FLYWAY_DB_URL="jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
# Migrations already applied (V1-V27) — disable Flyway to avoid checksum validation
"$RAILWAY" variables set SPRING_FLYWAY_ENABLED="false"
# Use 'none' for ddl-auto to avoid Hibernate schema validation against Supabase
"$RAILWAY" variables set SPRING_JPA_HIBERNATE_DDL_AUTO="none"

# ── Firebase Admin SDK ────────────────────────────────────────────
"$RAILWAY" variables set FIREBASE_PROJECT_ID="gada-team"
# "$RAILWAY" variables set FIREBASE_SERVICE_ACCOUNT_JSON='<set in Railway dashboard — never hardcode>' 

# ── Toss Payments (test keys) ─────────────────────────────────────
"$RAILWAY" variables set TOSS_SECRET_KEY="test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R"

echo ""
echo "=== Environment variables set! ==="
echo ""
echo "=== Deploying to Railway ==="
"$RAILWAY" up --detach

echo ""
echo "=== Deployment triggered! ==="
echo "Check logs: railway logs --tail"
echo "Get URL:    railway domain"
