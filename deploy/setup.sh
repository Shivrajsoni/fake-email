#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; EXIT_CODE=1; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
step() { echo -e "\n${CYAN}== ${1}${NC}"; }

MAIL_DOMAIN="fake-email.site"
API_DOMAIN="api.${MAIL_DOMAIN}"
DATABASE_URL="${DATABASE_URL:-}"
VERCEL_ORIGIN="${VERCEL_ORIGIN:-}"
EXIT_CODE=0

usage() {
  echo "Usage: DATABASE_URL=<url> [VERCEL_ORIGIN=<url>] ./setup.sh"
  echo "  DATABASE_URL (required)  VERCEL_ORIGIN (optional, CORS)"
}

if [ -z "$DATABASE_URL" ]; then
  fail "DATABASE_URL is required"
  usage
  exit 1
fi

PUBLIC_IP=$(curl -s --connect-timeout 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || echo "unknown")
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

step "1/7 Preflight"
if [ "$(id -u)" -eq 0 ]; then fail "Run as non-root (e.g. ubuntu)"; exit 1; fi
if ! grep -qi "ubuntu\|debian" /etc/os-release 2>/dev/null; then fail "Ubuntu/Debian required"; exit 1; fi
if ! sudo -n true 2>/dev/null; then fail "Passwordless sudo required"; exit 1; fi
ok "IP: ${PUBLIC_IP}"

step "2/7 Packages"
sudo apt-get update -qq
sudo apt-get install -y -qq curl jq netcat-openbsd ca-certificates libssl3
ok "curl, jq, nc, libssl3 (runtime for http-server)"

step "3/7 DB reachability"
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
if timeout 5 bash -c "echo >/dev/tcp/${DB_HOST}/5432" 2>/dev/null; then ok "${DB_HOST}:5432"; else warn "Cannot reach ${DB_HOST}:5432"; fi

step "4/7 Binary dir, user, env"
sudo mkdir -p /opt/fake-email/bin
if [ -f /opt/fake-email/bin/http-server ]; then ok "Binary present"; else warn "No binary yet — deploy from CI"; fi
if id -u fake-email &>/dev/null; then ok "User fake-email"; else sudo useradd --system --no-create-home --shell /usr/sbin/nologin fake-email; ok "Created fake-email"; fi
sudo mkdir -p /etc/fake-email
CORS_ORIGINS="${VERCEL_ORIGIN:-https://${MAIL_DOMAIN},https://www.${MAIL_DOMAIN}}"
sudo tee /etc/fake-email/env > /dev/null <<EOF
DATABASE_URL=${DATABASE_URL}
DOMAIN=${MAIL_DOMAIN}
HTTP_HOST=127.0.0.1
HTTP_PORT=3001
SMTP_HOST=0.0.0.0
SMTP_PORT=25
CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}
PURGE_HOUR_UTC=3
EOF
sudo chmod 600 /etc/fake-email/env
sudo chown fake-email:fake-email /etc/fake-email/env
ok "/etc/fake-email/env"

step "5/7 systemd"
sudo cp "$SCRIPT_DIR/fake-email.service" /etc/systemd/system/fake-email.service
sudo systemctl daemon-reload
sudo systemctl enable fake-email
ok "fake-email.service"

step "6/7 Caddy"
if command -v caddy &>/dev/null; then ok "Caddy installed"; else
  sudo apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
  sudo apt-get update -qq && sudo apt-get install -y -qq caddy
  ok "Caddy installed"
fi
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
${API_DOMAIN} {
	reverse_proxy localhost:3001
}
EOF
ok "Caddyfile ${API_DOMAIN}"

step "7/7 Firewall & start"
if command -v ufw &>/dev/null; then
  for p in 22 25 80 443; do sudo ufw allow "${p}/tcp" >/dev/null 2>&1 || true; done
  sudo ufw --force enable >/dev/null 2>&1 || true
  ok "UFW 22,25,80,443"
else warn "Configure SG for 22,25,80,443"; fi
if [ -f /opt/fake-email/bin/http-server ]; then
  sudo systemctl restart fake-email
  for i in {1..30}; do
    curl -sf --max-time 2 http://127.0.0.1:3001/api/health | grep -q OK && break || sleep 1
  done
fi
sudo systemctl restart caddy
sleep 1

step "Health"
PASS=0; TOTAL=0
check() { TOTAL=$((TOTAL+1)); if eval "$2" >/dev/null 2>&1; then ok "$1"; PASS=$((PASS+1)); else fail "$1"; fi; }
if [ -f /opt/fake-email/bin/http-server ]; then
  check "fake-email active" "sudo systemctl is-active --quiet fake-email"
  check "HTTP 3001" "curl -sf --max-time 5 http://127.0.0.1:3001/api/health"
  check "SMTP 25" "echo QUIT | nc -w 2 127.0.0.1 25 | grep -q 220"
else warn "Skipping service checks (no binary)"; fi
check "caddy active" "sudo systemctl is-active --quiet caddy"
[ "$PASS" -eq "$TOTAL" ] && ok "${TOTAL}/${TOTAL} checks" || { fail "${PASS}/${TOTAL}"; warn "journalctl -u fake-email -n 30"; }

echo ""
echo "API https://${API_DOMAIN}  Mail *@${MAIL_DOMAIN}  IP ${PUBLIC_IP}"
echo "DNS: A ${API_DOMAIN}, A mail.${MAIL_DOMAIN} → IP; MX ${MAIL_DOMAIN} → mail.${MAIL_DOMAIN}"
echo "Vercel NEXT_PUBLIC_API_URL=https://${API_DOMAIN}"
echo "Secrets: EC2_HOST EC2_USER EC2_SSH_KEY"

exit $EXIT_CODE
