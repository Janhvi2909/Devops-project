# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Install backend production deps
FROM node:20-alpine AS backend-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Stage 3: Final production image
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

# Copy backend
COPY --from=backend-builder /app/server/node_modules ./node_modules
COPY --from=backend-builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY server/src ./src
COPY server/prisma ./prisma
COPY server/package*.json ./

# Copy frontend build into Express's public directory
COPY --from=frontend-builder /app/client/dist ./public

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
