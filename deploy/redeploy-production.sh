#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production. Copy .env.production.example and fill real production secrets first." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not reachable from this shell." >&2
  exit 1
fi

docker compose -f docker-compose.prod.yml --env-file .env.production config >/dev/null
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production ps

echo "Waiting for public health check..."
for _ in {1..30}; do
  if curl -fsS --max-time 10 https://ai.pect-dapp.io/api/status >/dev/null; then
    echo "Deployment is healthy: https://ai.pect-dapp.io/api/status"
    exit 0
  fi
  sleep 2
done

echo "Deployment command finished, but public health check did not pass within 60 seconds." >&2
exit 1
