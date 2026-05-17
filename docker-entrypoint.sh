#!/bin/sh

echo "=== LLM Radar Startup ==="

# Step 1: Run pre-migration (converts string roles to enum, idempotent)
echo "Running pre-migration checks..."
if node ./prisma/pre-migrate.mjs 2>&1; then
  echo "Pre-migration complete."
else
  echo "WARNING: Pre-migration failed (may be fine for fresh installs)"
fi

# Step 2: Run Prisma db push (schema sync)
echo "Running Prisma database migrations..."
if node ./node_modules/prisma/build/index.js db push --accept-data-loss --schema=./prisma/schema.prisma 2>&1; then
  echo "Database migrations complete."
elif npx prisma db push --accept-data-loss 2>&1; then
  echo "Database migrations complete (via npx)."
else
  echo "WARNING: Database migration failed - starting anyway"
fi

echo "Starting LLM Radar..."
exec "$@"
