#!/usr/bin/env bash
#
# One-time setup: installs the fake-email systemd service on an AWS Linux / Ubuntu server.
# Run as root or with sudo.
#
set -euo pipefail

INSTALL_DIR="/opt/fake-email"
SERVICE_NAME="fake-email"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

log() { printf "${GREEN}[INSTALL]${NC} %s\n" "$*"; }
err() { printf "${RED}[ERROR]${NC}   %s\n" "$*" >&2; }
die() { err "$@"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "This script must be run as root (use sudo)."
command -v docker >/dev/null 2>&1 || die "docker is not installed."
docker compose version >/dev/null 2>&1 || die "'docker compose' plugin is not installed."

# ── Deploy the project files ────────────────────────────────────────

log "Copying project to $INSTALL_DIR ..."
mkdir -p "$INSTALL_DIR"
rsync -a --exclude='target' --exclude='.git' --exclude='ui/node_modules' \
    "${SCRIPT_DIR}/" "$INSTALL_DIR/"

# ── Install the systemd unit ────────────────────────────────────────

log "Installing systemd service ..."
cp "$INSTALL_DIR/deploy/fake-email.service" "$SERVICE_FILE"

# Patch WorkingDirectory to the actual install path
sed -i "s|WorkingDirectory=.*|WorkingDirectory=${INSTALL_DIR}|" "$SERVICE_FILE"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

log "Starting ${SERVICE_NAME} ..."
systemctl start "$SERVICE_NAME"

echo ""
log "Done. The service is now running and will auto-start on boot."
echo ""
echo "  Status  : systemctl status ${SERVICE_NAME}"
echo "  Logs    : journalctl -u ${SERVICE_NAME} -f"
echo "  Restart : systemctl restart ${SERVICE_NAME}"
echo "  Stop    : systemctl stop ${SERVICE_NAME}"
echo ""
