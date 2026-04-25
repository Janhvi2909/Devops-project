# Stage 1: Build (install all deps + generate Prisma client)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate
COPY src ./src/

# Stage 2: Production (copy only what's needed)
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:./data/dev.db"

RUN mkdir -p ./data && chown -R appuser:appgroup /app
USER appuser
RUN npx prisma db push --skip-generate 2>/dev/null || true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "src/index.js"]
