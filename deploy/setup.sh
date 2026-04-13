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
step() { echo -e "\n${CYAN}══ $1${NC}"; }

MAIL_DOMAIN="fake-email.site"
API_DOMAIN="api.${MAIL_DOMAIN}"
DATABASE_URL="${DATABASE_URL:-}"
VERCEL_ORIGIN="${VERCEL_ORIGIN:-}"
EXIT_CODE=0

usage() {
  echo "Usage: DATABASE_URL=<url> [VERCEL_ORIGIN=<url>] ./setup.sh"
  echo ""
  echo "  DATABASE_URL    (required) Serverless Postgres connection string"
  echo "  VERCEL_ORIGIN   (optional) Frontend URL for CORS"
  echo ""
  echo "Example:"
  echo "  DATABASE_URL='postgres://user:pass@ep-xyz.neon.tech/fake_email?sslmode=require' \\"
  echo "  VERCEL_ORIGIN='https://fake-email.vercel.app' \\"
  echo "  ./deploy/setup.sh"
}

if [ -z "$DATABASE_URL" ]; then
  fail "DATABASE_URL is required"
  echo ""
  usage
  exit 1
fi

PUBLIC_IP=$(curl -s --connect-timeout 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || echo "unknown")
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─────────────────────────────────────────────
# 1. Preflight
# ─────────────────────────────────────────────
step "1/7 Preflight checks"

if [ "$(id -u)" -eq 0 ]; then
  fail "Do not run as root. Run as ubuntu user with sudo access."
  exit 1
fi

if ! grep -qi "ubuntu\|debian" /etc/os-release 2>/dev/null; then
  fail "This script targets Ubuntu/Debian."
  exit 1
fi

if ! sudo -n true 2>/dev/null; then
  fail "User needs passwordless sudo."
  exit 1
fi

ok "Ubuntu $(lsb_release -rs 2>/dev/null || echo '?'), sudo OK, IP: ${PUBLIC_IP}"

# ─────────────────────────────────────────────
# 2. System packages
# ─────────────────────────────────────────────
step "2/7 System packages"
sudo apt-get update -qq
sudo apt-get install -y -qq curl jq netcat-openbsd
ok "curl, jq, nc installed"

# ─────────────────────────────────────────────
# 3. Verify DB connectivity
# ─────────────────────────────────────────────
step "3/7 Database connectivity"
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
if timeout 5 bash -c "echo >/dev/tcp/${DB_HOST}/5432" 2>/dev/null; then
  ok "Can reach ${DB_HOST}:5432"
else
  warn "Cannot reach ${DB_HOST}:5432 — check DATABASE_URL and security group outbound rules"
fi

# ─────────────────────────────────────────────
# 4. Install binary + service user + env
# ─────────────────────────────────────────────
step "4/7 Binary, service user & environment"

sudo mkdir -p /opt/fake-email/bin

if [ -f /opt/fake-email/bin/http-server ]; then
  ok "Binary already at /opt/fake-email/bin/http-server (CI deploys updates)"
else
  warn "No binary found — CI will deploy it on next push to main"
fi

if id -u fake-email &>/dev/null; then
  ok "User 'fake-email' exists"
else
  sudo useradd --system --no-create-home --shell /usr/sbin/nologin fake-email
  ok "Created user 'fake-email'"
fi

sudo mkdir -p /etc/fake-email

CORS_ORIGINS="${VERCEL_ORIGIN:-https://${MAIL_DOMAIN}}"

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
ok "/etc/fake-email/env written (chmod 600)"

# ─────────────────────────────────────────────
# 5. systemd service
# ─────────────────────────────────────────────
step "5/7 systemd service"
sudo cp "$SCRIPT_DIR/fake-email.service" /etc/systemd/system/fake-email.service
sudo systemctl daemon-reload
sudo systemctl enable fake-email
ok "fake-email.service installed & enabled"

# ─────────────────────────────────────────────
# 6. Caddy (reverse proxy + auto TLS)
# ─────────────────────────────────────────────
step "6/7 Caddy reverse proxy"
if command -v caddy &>/dev/null; then
  ok "Caddy already installed: $(caddy version 2>/dev/null || echo 'unknown')"
else
  sudo apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq caddy
  ok "Caddy installed"
fi

sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
${API_DOMAIN} {
	reverse_proxy localhost:3001
}
EOF
ok "Caddyfile: ${API_DOMAIN} -> localhost:3001"

# ─────────────────────────────────────────────
# 7. Firewall + start
# ─────────────────────────────────────────────
step "7/7 Firewall & launch"

if command -v ufw &>/dev/null; then
  sudo ufw allow 22/tcp   >/dev/null 2>&1 || true
  sudo ufw allow 80/tcp   >/dev/null 2>&1 || true
  sudo ufw allow 443/tcp  >/dev/null 2>&1 || true
  sudo ufw allow 25/tcp   >/dev/null 2>&1 || true
  sudo ufw --force enable >/dev/null 2>&1 || true
  ok "UFW: ports 22, 25, 80, 443 open"
else
  warn "ufw not found — ensure AWS security group allows TCP 22, 25, 80, 443"
fi

if [ -f /opt/fake-email/bin/http-server ]; then
  sudo systemctl restart fake-email
  sleep 2
fi
sudo systemctl restart caddy
sleep 1

# ─────────────────────────────────────────────
# Health checks
# ─────────────────────────────────────────────
step "Health checks"
PASS=0
TOTAL=0

check() {
  TOTAL=$((TOTAL + 1))
  if eval "$2" >/dev/null 2>&1; then
    ok "$1"
    PASS=$((PASS + 1))
  else
    fail "$1"
  fi
}

if [ -f /opt/fake-email/bin/http-server ]; then
  check "fake-email.service active" "sudo systemctl is-active --quiet fake-email"
  check "HTTP :3001 responds"       "curl -sf --max-time 5 http://127.0.0.1:3001/api/health"
  check "SMTP :25 responds"         "echo QUIT | nc -w 2 127.0.0.1 25 | grep -q 220"
else
  warn "Binary not deployed yet — skipping service checks (push to main to trigger CI deploy)"
fi
check "caddy.service active" "sudo systemctl is-active --quiet caddy"

echo ""
if [ "$PASS" -eq "$TOTAL" ]; then
  ok "All ${TOTAL}/${TOTAL} checks passed"
else
  fail "${PASS}/${TOTAL} checks passed"
  echo ""
  warn "Debug with:"
  echo "  sudo journalctl -u fake-email --no-pager -n 30"
  echo "  sudo journalctl -u caddy --no-pager -n 30"
fi

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  fake-email.site — setup complete${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Public IP:   ${GREEN}${PUBLIC_IP}${NC}"
echo -e "  API:         ${GREEN}https://${API_DOMAIN}${NC}"
echo -e "  Mail:        ${GREEN}*@${MAIL_DOMAIN}${NC}"
echo -e "  DB:          ${GREEN}serverless (external)${NC}"
echo ""
echo -e "${CYAN}Traffic flow:${NC}"
echo "  :443 HTTPS  →  Caddy (auto-TLS)  →  localhost:3001  (HTTP API)"
echo "  :80  HTTP   →  Caddy             →  redirect to 443"
echo "  :25  SMTP   →  directly          →  fake-email binary"
echo ""
echo -e "${CYAN}DNS records required:${NC}"
echo "  A     ${API_DOMAIN}          →  ${PUBLIC_IP}"
echo "  A     mail.${MAIL_DOMAIN}    →  ${PUBLIC_IP}"
echo "  MX    ${MAIL_DOMAIN}         →  mail.${MAIL_DOMAIN}  (priority 10)"
echo "  TXT   ${MAIL_DOMAIN}         →  \"v=spf1 ip4:${PUBLIC_IP} ~all\""
echo ""
echo -e "${CYAN}AWS security group inbound rules:${NC}"
echo "  TCP 22   (SSH)    0.0.0.0/0"
echo "  TCP 25   (SMTP)   0.0.0.0/0"
echo "  TCP 80   (HTTP)   0.0.0.0/0"
echo "  TCP 443  (HTTPS)  0.0.0.0/0"
echo ""
echo -e "${CYAN}Vercel frontend:${NC}"
echo "  NEXT_PUBLIC_API_URL=https://${API_DOMAIN}"
echo ""
echo -e "${CYAN}Deploy flow:${NC}"
echo "  Push to main → CI builds binary → SCP to EC2 → systemctl restart"
echo ""
echo -e "${CYAN}GitHub secrets needed:${NC}"
echo "  EC2_HOST      ${PUBLIC_IP}"
echo "  EC2_USER      ubuntu"
echo "  EC2_SSH_KEY   (paste your .pem private key)"
echo ""
echo -e "${CYAN}Commands:${NC}"
echo "  sudo journalctl -u fake-email -f       # live logs"
echo "  sudo systemctl restart fake-email      # restart"
echo "  sudo nano /etc/fake-email/env          # edit config"
echo "  curl https://${API_DOMAIN}/api/health  # test"

exit $EXIT_CODE
