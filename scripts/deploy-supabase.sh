#!/usr/bin/env bash
# deploy-supabase.sh — Create Supabase project and run migrations
# Usage: SUPABASE_ACCESS_TOKEN=xxx ./scripts/deploy-supabase.sh
set -euo pipefail

PROJECT_NAME="gada-team"
DB_REGION="ap-southeast-1"  # Singapore (closest to Korea)
ORG_ID="${SUPABASE_ORG_ID:-}"

echo "==> Logging in to Supabase..."
supabase login --token "${SUPABASE_ACCESS_TOKEN}"

echo ""
echo "==> Fetching organization list..."
supabase orgs list

if [ -z "$ORG_ID" ]; then
  echo ""
  read -rp "Enter your Supabase Organization ID (from above): " ORG_ID
fi

echo ""
echo "==> Creating Supabase project: $PROJECT_NAME (region: $DB_REGION)..."
# Note: --db-password will be prompted or can be set via env
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-$(openssl rand -base64 20 | tr -dc 'A-Za-z0-9' | head -c 20)}"
echo "   DB Password: $DB_PASSWORD (save this!)"

supabase projects create "$PROJECT_NAME" \
  --org-id "$ORG_ID" \
  --region "$DB_REGION" \
  --db-password "$DB_PASSWORD"

echo ""
echo "==> Listing projects to get project ref..."
supabase projects list

read -rp "Enter the project ref (e.g. abcdefghijklmnop): " PROJECT_REF

echo ""
echo "==> Linking project..."
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"

echo ""
echo "==> Getting database connection info..."
supabase status

echo ""
echo "==> Running Flyway migrations via Spring Boot test..."
echo "    (The API will run migrations automatically on first startup)"
echo ""
echo "Connection strings to add to Railway:"
echo "  DB_URL=jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
echo "  DB_USERNAME=postgres.${PROJECT_REF}"
echo "  DB_PASSWORD=${DB_PASSWORD}"
echo "  FLYWAY_DB_URL=jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
echo ""
echo "✓ Supabase setup complete!"
