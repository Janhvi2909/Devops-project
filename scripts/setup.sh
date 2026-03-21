#!/bin/bash
# Idempotent setup script - safe to run multiple times
set -e

echo "=== TaskFlow Setup Script ==="

# Create necessary directories
mkdir -p server/prisma
mkdir -p client/src/components
mkdir -p scripts

# Install server dependencies if node_modules doesn't exist or package.json changed
if [ ! -d "server/node_modules" ] || [ "server/package.json" -nt "server/node_modules" ]; then
  echo "Installing server dependencies..."
  cd server && npm install && cd ..
else
  echo "Server dependencies already up to date."
fi

# Install client dependencies if node_modules doesn't exist or package.json changed
if [ ! -d "client/node_modules" ] || [ "client/package.json" -nt "client/node_modules" ]; then
  echo "Installing client dependencies..."
  cd client && npm install && cd ..
else
  echo "Client dependencies already up to date."
fi

# Generate Prisma client
echo "Generating Prisma client..."
cd server && npx prisma generate && cd ..

# Create .env file if it doesn't exist
if [ ! -f "server/.env" ]; then
  echo 'DATABASE_URL="file:./dev.db"' > server/.env
  echo "PORT=3001" >> server/.env
  echo "Created server/.env"
else
  echo "server/.env already exists."
fi

# Push database schema
echo "Pushing database schema..."
cd server && npx prisma db push && cd ..

echo "=== Setup complete! ==="
echo "Run 'cd server && npm run dev' to start the backend"
echo "Run 'cd client && npm run dev' to start the frontend"
