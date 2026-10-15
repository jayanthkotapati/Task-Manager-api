#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 22.04/24.04 EC2 instance.
#   curl -fsSL https://raw.githubusercontent.com/<you>/task-manager-api/main/deploy/ec2-setup.sh | bash
set -euo pipefail

sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git

# Install Docker (official convenience script) + compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

echo "Docker installed. Log out and back in (or run 'newgrp docker'), then:"
echo "  git clone https://github.com/<you>/task-manager-api.git && cd task-manager-api"
echo "  echo \"JWT_SECRET=\$(openssl rand -hex 32)\" > .env"
echo "  docker compose up -d --build"
echo "  docker compose exec api node scripts/seed.js   # optional demo data"
