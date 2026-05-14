#!/bin/sh

echo "=== LLM Radar Startup ==="
echo "Running Prisma database migrations..."

# Try direct node path first, then npx fallback
if node ./node_modules/prisma/build/index.js db push --accept-data-loss --schema=./prisma/schema.prisma 2>&1; then
  echo "Database migrations complete."
elif npx prisma db push --accept-data-loss 2>&1; then
  echo "Database migrations complete (via npx)."
else
  echo "WARNING: Database migration failed - starting anyway"
fi

echo "Starting LLM Radar..."
exec "$@"
