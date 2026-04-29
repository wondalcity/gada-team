#!/usr/bin/env bash
# deploy-vercel.sh — Deploy web + admin to Vercel
# Run from repo root: ./scripts/deploy-vercel.sh
set -euo pipefail

RAILWAY_API_URL="${RAILWAY_API_URL:-}"

if [ -z "$RAILWAY_API_URL" ]; then
  read -rp "Enter Railway API URL (e.g. https://gada-api.up.railway.app): " RAILWAY_API_URL
fi

echo "==> Deploying web app to Vercel..."
cd apps/web
vercel --prod \
  -e INTERNAL_API_URL="${RAILWAY_API_URL}/api" \
  -e NEXT_PUBLIC_API_URL="${RAILWAY_API_URL}" \
  --yes
cd ../..

echo ""
echo "==> Deploying admin app to Vercel..."
cd apps/admin
vercel --prod \
  -e INTERNAL_API_URL="${RAILWAY_API_URL}/api" \
  --yes
cd ../..

echo ""
echo "✓ Vercel deployments complete!"
echo "  Web:   check Vercel dashboard for URL"
echo "  Admin: check Vercel dashboard for URL"
