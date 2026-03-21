#!/bin/bash
# Idempotent EC2 bootstrap script - safe to run multiple times
set -e

echo "=== TaskFlow EC2 Bootstrap ==="

# Update system packages
echo "Updating system packages..."
sudo apt-get update -y

# Install Node.js if not present (using NodeSource)
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "Node.js already installed: $(node --version)"
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
  echo "Installing Git..."
  sudo apt-get install -y git
else
  echo "Git already installed: $(git --version)"
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  sudo npm install -g pm2
else
  echo "PM2 already installed: $(pm2 --version)"
fi

# Setup PM2 to start on boot (idempotent)
pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || true

# Create app directory if it doesn't exist
mkdir -p ~/taskflow

# Setup swap if not already configured (helps on small instances)
if ! swapon --show | grep -q '/swapfile'; then
  echo "Setting up swap space..."
  sudo fallocate -l 1G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
  echo "Swap already configured."
fi

echo "=== Bootstrap complete! ==="
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "PM2: $(pm2 --version)"
