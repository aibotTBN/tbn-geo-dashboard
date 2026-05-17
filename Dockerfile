# ---- Optimized for Coolify (Hetzner CPX22, 4GB RAM) ----

# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install deps first (cacheable layer — only invalidated by package.json changes)
# --ignore-scripts skips postinstall (prisma generate) since schema isn't copied yet
COPY package.json package-lock.json* ./
RUN npm install --prefer-offline --no-audit --no-fund --ignore-scripts

# Copy prisma schema & generate client (separate layer — fast, low RAM)
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build with limited memory
COPY . .
RUN mkdir -p public
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production (minimal image)
FROM node:20-alpine AS runner
WORKDIR /app

# Set timezone to Europe/Berlin
ENV TZ=Europe/Berlin
RUN apk add --no-cache tzdata curl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Copy pre-migration script
COPY --from=builder /app/prisma/pre-migrate.mjs ./prisma/pre-migrate.mjs

RUN chown -R nextjs:nodejs .

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
