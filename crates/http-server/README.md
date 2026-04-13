# `http-server` — HTTP API + SMTP for temporary mail

Single binary that runs both the HTTP API (Axum, port 3001) and inbound SMTP (port 25). Connects to Postgres via `DATABASE_URL`.

## API

| Method | Path                     | Description                              |
| ------ | ------------------------ | ---------------------------------------- |
| `GET`  | `/api/health`            | 200 if DB ready, 503 if not              |
| `POST` | `/api/temporary-address` | `{ "username": optional }` → `{ "temp_email_addr": "..." }` |
| `GET`  | `/api/inbox/poll`        | `?address=...&since=...` → messages      |

## Environment variables

| Variable                  | Required | Default        | Role                                    |
| ------------------------- | -------- | -------------- | --------------------------------------- |
| `DATABASE_URL`            | yes      |                | Postgres connection string              |
| `DOMAIN`                  | yes      |                | Mail domain for generated addresses     |
| `HTTP_HOST`               | no       | `0.0.0.0`      | HTTP bind address                       |
| `HTTP_PORT`               | no       | `3001`         | HTTP bind port                          |
| `SMTP_HOST`               | no       | `0.0.0.0`      | SMTP bind address                       |
| `SMTP_PORT`               | no       | `25`           | SMTP bind port                          |
| `CORS_ALLOWED_ORIGINS`    | no       |                | Comma-separated origins for browser CORS |

## Build with Nix

```bash
nix build .#backend
./result/bin/http-server
```

## Production deploy (Ubuntu EC2 + Caddy)

The `deploy/` directory has everything you need:

```
deploy/
├── setup.sh              # one-command setup script
├── fake-email.service    # systemd unit
└── Caddyfile             # reverse proxy config
```

### How it works

```
Internet                     EC2 (Ubuntu)
─────────────────────────────────────────────
:443 HTTPS ──► Caddy ──► localhost:3001 (HTTP API)
:80  HTTP  ──► Caddy ──► (redirect to 443)
:25  SMTP  ──────────────► localhost:25 (SMTP server)
```

- **Caddy** handles TLS certificates automatically (Let's Encrypt), listens on 80/443, proxies to your Rust binary on 3001
- **SMTP** binds directly to port 25 (no proxy needed — SMTP doesn't use TLS for receive in this setup)
- **systemd** manages the backend process (auto-restart, runs as unprivileged user)

### CI/CD deploy flow (recommended)

Pushing to `main` triggers automatic deployment:

1. GitHub Actions builds the binary on a CI runner (7 GB RAM — no resource constraints)
2. The build is pushed to **Cachix** (binary cache)
3. CI SSHs into EC2 and runs `nix build .#backend` which **downloads** the pre-built binary from Cachix (no compilation on EC2)
4. The binary is copied to `/opt/fake-email/bin/` and the service is restarted

The binary links against OpenSSL dynamically via Nix store paths, so Nix must be present on the EC2 box to resolve `/nix/store/...` library paths. Cachix ensures no compilation happens on the server.

**Required GitHub secrets:**

| Secret           | Value                                    |
| ---------------- | ---------------------------------------- |
| `CACHIX_AUTH_TOKEN` | Cachix auth token for the `fake-email` cache |
| `EC2_HOST`       | Elastic IP or hostname of the EC2 instance |
| `EC2_USER`       | SSH user (typically `ubuntu`)            |
| `EC2_SSH_KEY`    | Private SSH key for the EC2 instance     |

### First-time EC2 setup

```bash
git clone <your-repo> && cd fake-email
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" \
VERCEL_ORIGIN="https://your-app.vercel.app" \
./deploy/setup.sh
```

### AWS specs

| Resource        | Recommended                     |
| --------------- | ------------------------------- |
| Instance        | t3.micro (1 GB) or t3.small (2 GB) |
| Volume          | 20 GB gp3                       |
| Security group  | Inbound TCP: 22, 25, 80, 443   |
| Elastic IP      | Required (DNS + MX records)     |

### DNS records

| Type | Name                | Value                           |
| ---- | ------------------- | ------------------------------- |
| A    | api.fake-email.site | EC2 Elastic IP                  |
| A    | fake-email.site     | EC2 Elastic IP                  |
| MX   | fake-email.site     | fake-email.site (priority 10)   |
| TXT  | fake-email.site     | `v=spf1 ip4:<Elastic IP> ~all`  |

## Vercel UI

Set in Vercel project environment:
- `NEXT_PUBLIC_API_URL=https://api.fake-email.site`

Set on EC2 in `/etc/fake-email/env`:
- `CORS_ALLOWED_ORIGINS=https://your-app.vercel.app`
