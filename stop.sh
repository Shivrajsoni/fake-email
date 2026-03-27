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

if [[ "${1:-}" == "--volumes" ]]; then
  docker compose down --remove-orphans --volumes
else
  docker compose down --remove-orphans
fi

echo "All fake-email services are stopped."
