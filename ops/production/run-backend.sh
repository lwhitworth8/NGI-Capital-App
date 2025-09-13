#!/usr/bin/env bash
set -euo pipefail

# Usage: ./run-backend.sh
# Requires: Docker + Docker Compose plugin; .env in repo root (../.. relative to this script)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "../../.env" ]; then
  echo "Missing ../../.env. Copy ops/production/.env.backend.example and fill production values." >&2
  exit 1
fi

docker compose -f docker-compose.api.yml up -d --build
echo "Backend started. If you published port 8001, check: curl http://127.0.0.1:8001/api/health"

