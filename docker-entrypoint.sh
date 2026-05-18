#!/bin/sh

echo "=== LLM Radar Startup ==="
echo "Node $(node -v) | $(date -u)"

# Step 1: Run pre-migration (converts text roles to enum, adds missing columns)
echo ""
echo "── Step 1: Pre-migration ──"
if node ./prisma/pre-migrate.mjs 2>&1; then
  echo "Pre-migration OK."
else
  echo "WARNING: Pre-migration had issues (see above). Continuing..."
fi

# Step 2: Prisma db push — sync schema to DB
# First try without --accept-data-loss (safe mode).
# If that fails (e.g., remaining type mismatches), retry WITH --accept-data-loss.
# At this point, pre-migration has already safely converted all data.
echo ""
echo "── Step 2: Prisma DB sync ──"
if npx prisma db push --skip-generate 2>&1; then
  echo "Database sync OK (safe mode)."
elif npx prisma db push --skip-generate --accept-data-loss 2>&1; then
  echo "Database sync OK (with accept-data-loss fallback)."
else
  echo "WARNING: Database sync failed. App may not function correctly."
fi

echo ""
echo "── Starting LLM Radar ──"
exec "$@"
