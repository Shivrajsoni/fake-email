# `http-server` — HTTP API + SMTP for temporary mail

Single binary that runs both the HTTP API (Axum) and inbound SMTP. Connects to Postgres via `DATABASE_URL`.

For the **full project** overview (UI, DNS, CI, EC2), see the repository root `[README.md](../../README.md)`.

## API


| Method | Path                     | Description                                                 |
| ------ | ------------------------ | ----------------------------------------------------------- |
| `GET`  | `/api/health`            | 200 if DB ready, 503 if not                                 |
| `POST` | `/api/temporary-address` | `{ "username": optional }` → `{ "temp_email_addr": "..." }` |
| `GET`  | `/api/inbox/poll`        | `?address=...&since=...` → messages                         |


## Environment variables


| Variable                 | Required | Default   | Role                                                                       |
| ------------------------ | -------- | --------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`           | yes      |           | Postgres connection string                                                 |
| `DOMAIN` / `MAIL_DOMAIN` | yes      |           | Mail domain for generated addresses                                        |
| `HTTP_HOST`              | no       | `0.0.0.0` | HTTP bind address                                                          |
| `HTTP_PORT`              | no       | `3001`    | HTTP bind port                                                             |
| `SMTP_HOST`              | no       | `0.0.0.0` | SMTP bind address (use `0.0.0.0` in prod so port 25 accepts internet mail) |
| `SMTP_PORT`              | no       | `25`      | SMTP bind port                                                             |
| `CORS_ALLOWED_ORIGINS`   | no       |           | Comma-separated origins for browser CORS                                   |
| `PURGE_HOUR_UTC`         | no       | `3`       | Hour (0–23 UTC) for daily data purge                                       |


## Build with Nix (same as CI)

```bash
nix build .#backend --extra-experimental-features "nix-command flakes"
./result/bin/http-server
```

On macOS this produces a **macOS** binary; production uses the **Linux** artifact built in GitHub Actions.

## Production deploy (Ubuntu EC2 + Caddy)

`[deploy/setup.sh](../../deploy/setup.sh)` installs Caddy and writes `/etc/caddy/Caddyfile` for `api.<domain>`. `[deploy/fake-email.service](../../deploy/fake-email.service)` is the systemd unit.

```
Internet                     EC2 (Ubuntu)
─────────────────────────────────────────────
:443 HTTPS ──► Caddy ──► localhost:3001 (HTTP API)
:80  HTTP  ──► Caddy ──► (ACME / redirect)
:25  SMTP  ──────────────► :25 (SMTP server, bind 0.0.0.0)
```

### CI/CD (push to `main`)

1. GitHub Actions runs `nix build .#backend` on `ubuntu-latest`.
2. The `http-server` binary is uploaded as a workflow artifact.
3. The deploy job SCPs it to EC2 and runs `systemctl restart fake-email`.

**GitHub secrets:** `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` (see root `README.md`).

### First-time EC2 setup

```bash
git clone <your-repo> && cd fake-email
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" \
VERCEL_ORIGIN="https://your-app.vercel.app" \
./deploy/setup.sh
```

### AWS


| Resource       | Recommended                  |
| -------------- | ---------------------------- |
| Instance       | t3.micro or t3.small         |
| Security group | Inbound TCP: 22, 25, 80, 443 |
| Elastic IP     | Recommended for stable DNS   |


### DNS (recommended shape)


| Type | Name                   | Value                                     |
| ---- | ---------------------- | ----------------------------------------- |
| A    | `api.fake-email.site`  | EC2 Elastic IP                            |
| A    | `mail.fake-email.site` | EC2 Elastic IP                            |
| MX   | `fake-email.site`      | `mail.fake-email.site` (priority 1 or 10) |
| TXT  | `fake-email.site`      | `v=spf1 ip4:<Elastic IP> ~all`            |


## Vercel UI

- Vercel: `NEXT_PUBLIC_API_URL=https://api.fake-email.site`
- EC2 `/etc/fake-email/env`: `CORS_ALLOWED_ORIGINS=https://your-app.vercel.app`

