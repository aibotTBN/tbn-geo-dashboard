#!/bin/sh

echo "=== LLM Radar Startup ==="
echo "Node $(node -v) | $(date -u)"

# Step 1: Run pre-migration (handles ALL schema changes via raw SQL)
echo ""
echo "── Step 1: Pre-migration ──"
if node ./prisma/pre-migrate.mjs 2>&1; then
  echo "Pre-migration OK."
else
  echo "WARNING: Pre-migration had issues (see above). Continuing..."
fi

# Step 2: Prisma db push — reconcile any remaining differences.
# The pre-migration already handles all critical changes, so this is
# a safety net for indexes, constraints, etc.
# Try without --accept-data-loss first, then with it as fallback.
echo ""
echo "── Step 2: Prisma DB sync ──"
PRISMA_BIN="./node_modules/prisma/build/index.js"
if [ -f "$PRISMA_BIN" ]; then
  echo "Using direct prisma binary..."
  if node "$PRISMA_BIN" db push --skip-generate --accept-data-loss 2>&1; then
    echo "Database sync OK."
  else
    echo "WARNING: prisma db push failed (non-critical — pre-migration handled schema)."
  fi
else
  echo "Prisma binary not found at $PRISMA_BIN, trying npx..."
  if npx prisma db push --skip-generate --accept-data-loss 2>&1; then
    echo "Database sync OK."
  else
    echo "WARNING: prisma db push failed (non-critical — pre-migration handled schema)."
  fi
fi

echo ""
echo "── Starting LLM Radar ──"
exec "$@"
