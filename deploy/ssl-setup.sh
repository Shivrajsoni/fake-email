#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="fake-email"

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log()  { printf "${GREEN}[SSL]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[SSL]${NC} %s\n" "$*"; }
err()  { printf "${RED}[SSL]${NC} %s\n" "$*" >&2; }
die()  { err "$@"; exit 1; }

load_env_domain() {
  if [ -z "$DOMAIN" ] && [ -f ".env" ]; then
    DOMAIN="$(grep -E '^DOMAIN=' .env | head -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'")" || true
  fi
  [ -n "$DOMAIN" ] || die "DOMAIN is required. Set it like: DOMAIN=example.com EMAIL=you@example.com ./deploy/ssl-setup.sh"
  [ -n "$EMAIL" ]  || die "EMAIL is required. Set it like: DOMAIN=example.com EMAIL=you@example.com ./deploy/ssl-setup.sh"
}

ensure_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  else
    die "'docker compose' is required on the server."
  fi
}

write_nginx_from_template() {
  local src="$1"
  log "Switching Nginx config to $(basename "$src") for domain: $DOMAIN"
  sed "s/fake-email\\.site/${DOMAIN}/g" "$src" > deploy/nginx.conf
}

main() {
  cd "$(dirname "$0")/.."

  load_env_domain
  ensure_compose_cmd

  # 1) Start stack with HTTP-only config so ACME challenge works.
  write_nginx_from_template deploy/nginx.http.conf
  log "Starting nginx (HTTP) ..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d nginx

  log "Requesting Let's Encrypt certificate ..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" --agree-tos --no-eff-email

  # 2) Switch nginx to HTTPS config and restart.
  write_nginx_from_template deploy/nginx.https.conf
  log "Restarting nginx (HTTPS) ..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart nginx

  log "Done. Verify: https://${DOMAIN}/healthz"
  warn "Renewal: run './deploy/ssl-renew.sh' (you can cron it)."
}

main "$@"

