#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "error: docker compose plugin is required"
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DOMAIN:?DOMAIN is required (set in .env or shell env)}"

export POSTGRES_USER="${POSTGRES_USER:-fake_email}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-fake_email_dev}"
export POSTGRES_DB="${POSTGRES_DB:-fake_email}"
# Default 5433 on host so local Postgres (or other stacks) on 5432 does not block startup.
export POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5433}"
export HTTP_PORT="${HTTP_PORT:-3001}"
export SMTP_PORT="${SMTP_PORT:-2525}"

echo "Building images..."
# COMPOSE_PARALLEL_LIMIT=1: avoid two heavy Rust builds at once on small EC2 disks.
COMPOSE_PARALLEL_LIMIT=1 docker compose build db-migrate http-server smtp-server

echo "Starting postgres..."
docker compose up -d postgres

echo "Running database migrations..."
docker compose run --rm db-migrate

echo "Starting application services..."
docker compose up -d http-server smtp-server

echo
echo "Services are running:"
echo "- HTTP API:  http://127.0.0.1:${HTTP_PORT}"
echo "- SMTP:      127.0.0.1:${SMTP_PORT}"
echo "- Postgres:  127.0.0.1:${POSTGRES_HOST_PORT}"
echo
echo "Use './stop.sh' to stop everything."
