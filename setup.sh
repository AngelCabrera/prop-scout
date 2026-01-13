#!/bin/bash
# setup.sh - Auto-configuration for PropScout Engine
export DEBIAN_FRONTEND=noninteractive

# 1. Update & Essentials
apt-get update && apt-get upgrade -y
apt-get install -y git unzip build-essential

# 2. Install Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# 3. Global Tools
npm install -g pm2 typescript ts-node

# 4. Create Project Directory & Fix Permissions
mkdir -p /home/ubuntu/prop-scout
chown -R ubuntu:ubuntu /home/ubuntu/prop-scout

# 5. Open Firewall (UFW)
ufw allow OpenSSH
ufw --force enable
