#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="fake-email"

readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

log() { printf "${GREEN}[RENEW]${NC} %s\n" "$*"; }
err() { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }
die() { err "$@"; exit 1; }

if ! docker compose version >/dev/null 2>&1; then
  die "'docker compose' is required."
fi

cd "$(dirname "$0")/.."

log "Renewing certificates (if due) ..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" run --rm certbot renew

log "Reloading nginx ..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec -T nginx nginx -s reload || \
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart nginx

log "Done."

