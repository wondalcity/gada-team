#!/usr/bin/env bash
# deploy-vercel.sh — Deploy web + admin to Vercel
# Run from repo root: ./scripts/deploy-vercel.sh
# Prereq: vercel login (already done), Railway API deployed first
set -euo pipefail

cd "$(dirname "$0")/.."

RAILWAY_API_URL="${RAILWAY_API_URL:-}"

if [ -z "$RAILWAY_API_URL" ]; then
  read -rp "Enter Railway API URL (e.g. https://gada-api.up.railway.app): " RAILWAY_API_URL
fi

# ── Firebase public config (gada-team project) ────────────────────
FB_API_KEY="AIzaSyBFbzuM0uap-20aOKCqr6l_uEUay7tkajs"
FB_AUTH_DOMAIN="gada-team.firebaseapp.com"
FB_PROJECT_ID="gada-team"
FB_STORAGE_BUCKET="gada-team.firebasestorage.app"
FB_SENDER_ID="611396731956"
FB_APP_ID="1:611396731956:web:01af2b98d5f4a6359cf661"

# ── Toss (test keys) ──────────────────────────────────────────────
TOSS_CLIENT_KEY="test_ck_D5GePWvyJnrK0W0k6q8gLzN97Ead"

echo ""
echo "==> Deploying web app to Vercel..."
# web/next.config.ts: rewrites /api/:path* → INTERNAL_API_URL/:path*  (so append /api)
cd apps/web
vercel --prod \
  -e NEXT_PUBLIC_API_URL="${RAILWAY_API_URL}" \
  -e INTERNAL_API_URL="${RAILWAY_API_URL}/api" \
  -e NEXT_PUBLIC_FIREBASE_API_KEY="${FB_API_KEY}" \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${FB_AUTH_DOMAIN}" \
  -e NEXT_PUBLIC_FIREBASE_PROJECT_ID="${FB_PROJECT_ID}" \
  -e NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${FB_STORAGE_BUCKET}" \
  -e NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${FB_SENDER_ID}" \
  -e NEXT_PUBLIC_FIREBASE_APP_ID="${FB_APP_ID}" \
  -e NEXT_PUBLIC_TOSS_CLIENT_KEY="${TOSS_CLIENT_KEY}" \
  --yes
cd ../..

echo ""
echo "==> Deploying admin app to Vercel..."
# admin/next.config.ts: rewrites /api/:path* → INTERNAL_API_URL/api/:path*  (no /api suffix)
cd apps/admin
vercel --prod \
  -e NEXT_PUBLIC_API_URL="${RAILWAY_API_URL}" \
  -e INTERNAL_API_URL="${RAILWAY_API_URL}" \
  --yes
cd ../..

echo ""
echo "✓ Vercel deployments complete!"
echo "  Check Vercel dashboard for URLs"
