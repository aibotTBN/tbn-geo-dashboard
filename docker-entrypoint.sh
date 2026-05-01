#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --accept-data-loss || echo "WARNING: DB push failed!"

echo "Starting LLM Radar..."
exec "$@"
# force-rebuild-v2
