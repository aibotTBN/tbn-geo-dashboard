#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --accept-data-loss 2>/dev/null || echo "DB push skipped (may already be up to date)"

echo "Starting LLM Radar..."
exec "$@"
