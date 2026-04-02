#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="fake-email"
ENV_FILE=".env"
ENV_SAMPLE=".env.sample"
HEALTH_URL="http://localhost/healthz"
HEALTH_TIMEOUT=120
SMTP_PORT=587

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log()   { printf "${GREEN}[START]${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }
die()   { err "$@"; exit 1; }

# ── Pre-flight checks ───────────────────────────────────────────────

check_prerequisites() {
    command -v docker >/dev/null 2>&1 || die "docker is not installed or not in PATH."

    if ! docker info >/dev/null 2>&1; then
        die "Docker daemon is not running. Please start Docker first."
    fi

    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        die "Neither 'docker compose' nor 'docker-compose' found."
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        die "Compose file '$COMPOSE_FILE' not found. Run this script from the project root."
    fi

    if [ ! -f "deploy/nginx.api.conf" ]; then
        die "Nginx config 'deploy/nginx.api.conf' not found. Run this script from the project root."
    fi
}

ensure_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_SAMPLE" ]; then
            warn ".env not found — copying from $ENV_SAMPLE"
            cp "$ENV_SAMPLE" "$ENV_FILE"
            warn "Review .env and update values before production use."
        else
            warn "No .env or $ENV_SAMPLE found; relying on compose-file defaults."
        fi
    fi
}

check_port_available() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
            die "Port $port is already in use. Free it before starting."
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tlnp | grep -q ":${port} "; then
            die "Port $port is already in use. Free it before starting."
        fi
    fi
}

# ── Core ─────────────────────────────────────────────────────────────

build_and_start() {
    log "Building images (this may take a few minutes on first run)..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build --pull 2>&1

    log "Starting services in detached mode..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --remove-orphans 2>&1
}

wait_for_health() {
    if ! command -v curl >/dev/null 2>&1; then
        warn "curl not found — skipping HTTP health check. Verify manually: $HEALTH_URL"
        return 0
    fi

    log "Waiting for API health check ($HEALTH_URL) ..."
    local elapsed=0
    local interval=3
    while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
        if curl -fsSo /dev/null "$HEALTH_URL" 2>/dev/null; then
            log "API is healthy."
            return 0
        fi
        sleep "$interval"
        elapsed=$((elapsed + interval))
        printf "."
    done
    printf "\n"
    err "API did not become healthy within ${HEALTH_TIMEOUT}s."
    err "Dumping recent logs for debugging:"
    $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs --tail=40
    return 1
}

print_status() {
    echo ""
    log "All services are running:"
    echo "  HTTP API (via Nginx) : http://localhost:80"
    echo "  SMTP                 : localhost:$SMTP_PORT"
    echo ""
    log "Useful commands:"
    echo "  Logs   : $COMPOSE_CMD -f $COMPOSE_FILE -p $PROJECT_NAME logs -f"
    echo "  Stop   : ./stop.sh"
    echo ""
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
    cd "$(dirname "$0")"

    log "Starting $PROJECT_NAME production stack..."

    check_prerequisites
    ensure_env_file

    # Only check ports if containers are not already running for this project
    if ! $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --status=running 2>/dev/null | grep -q "app"; then
        check_port_available 80
        check_port_available "$SMTP_PORT"
    fi

    build_and_start

    if wait_for_health; then
        print_status
    else
        die "Startup failed. Check the logs above."
    fi
}

main "$@"
