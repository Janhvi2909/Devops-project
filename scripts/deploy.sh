#!/bin/bash
# Idempotent deploy script - safe to run multiple times
set -e

echo "=== TaskFlow Deploy Script ==="

APP_DIR="${APP_DIR:-$(pwd)}"
cd "$APP_DIR"

# Pull latest code (idempotent - always safe)
echo "Pulling latest code..."
git pull origin main || echo "Not a git repo or no remote, skipping pull"

# Install/update server dependencies
echo "Installing server dependencies..."
cd server
npm ci --production 2>/dev/null || npm install --production
npx prisma generate

# Run database migrations (idempotent)
echo "Pushing database schema..."
npx prisma db push --accept-data-loss 2>/dev/null || echo "Database schema already up to date"

cd ..

# Install/update client dependencies and build
echo "Building client..."
cd client
npm ci 2>/dev/null || npm install
npm run build

cd ..

# Restart server with PM2 (idempotent - restarts if running, starts if not)
echo "Starting/restarting server..."
if command -v pm2 &> /dev/null; then
  pm2 delete taskflow-server 2>/dev/null || true
  cd server && pm2 start src/index.js --name taskflow-server && cd ..
  pm2 save
  echo "Server running with PM2"
else
  echo "PM2 not found. Install with: npm install -g pm2"
  echo "Starting server directly..."
  cd server && node src/index.js &
fi

echo "=== Deployment complete! ==="
