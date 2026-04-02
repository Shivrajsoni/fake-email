#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="fake-email"

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log()   { printf "${GREEN}[STOP]${NC}  %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }
die()   { err "$@"; exit 1; }

REMOVE_VOLUMES=false
FORCE=false

usage() {
    cat <<EOF
Usage: ./stop.sh [OPTIONS]

Stop the $PROJECT_NAME production stack.

Options:
  -v, --volumes   Also remove named volumes (DELETES ALL DATA including Postgres)
  -f, --force     Skip confirmation prompt when removing volumes
  -h, --help      Show this help message
EOF
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -v|--volumes)  REMOVE_VOLUMES=true; shift ;;
            -f|--force)    FORCE=true; shift ;;
            -h|--help)     usage ;;
            *)             die "Unknown option: $1. Use --help for usage." ;;
        esac
    done
}

check_prerequisites() {
    command -v docker >/dev/null 2>&1 || die "docker is not installed or not in PATH."

    if ! docker info >/dev/null 2>&1; then
        die "Docker daemon is not running."
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
}

confirm_volume_removal() {
    if $REMOVE_VOLUMES && ! $FORCE; then
        warn "This will permanently delete all data volumes (including the Postgres database)."
        printf "Are you sure? [y/N] "
        read -r answer
        case "$answer" in
            [yY]|[yY][eE][sS]) ;;
            *) log "Aborted."; exit 0 ;;
        esac
    fi
}

stop_services() {
    local running
    running=$($COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q 2>/dev/null || true)

    if [ -z "$running" ]; then
        log "No running containers found for project '$PROJECT_NAME'."
    else
        log "Stopping services (graceful 30s timeout)..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down --timeout 30 2>&1
        log "Services stopped."
    fi
}

remove_volumes() {
    if $REMOVE_VOLUMES; then
        log "Removing volumes..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down --volumes --timeout 30 2>&1
        log "Volumes removed."
    fi
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
    cd "$(dirname "$0")"
    parse_args "$@"

    log "Stopping $PROJECT_NAME production stack..."

    check_prerequisites
    confirm_volume_removal

    if $REMOVE_VOLUMES; then
        remove_volumes
    else
        stop_services
    fi

    log "Done."
}

main "$@"
