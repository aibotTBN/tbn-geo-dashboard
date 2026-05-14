#!/bin/sh
set -e

echo "Running Prisma database migrations..."
# Use direct path — npx fails in production image (no .bin/ symlinks)
node ./node_modules/prisma/build/index.js db push --accept-data-loss --schema=./prisma/schema.prisma 2>&1
echo "Database migrations complete."

echo "Starting LLM Radar..."
exec "$@"
