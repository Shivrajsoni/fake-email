# fake-email

Temporary email addresses: **Next.js** UI (Vercel), **Rust** backend on **EC2** (HTTP + SMTP), **Postgres** for storage.

**What it does:** create an address like `abc12@fake-email.site` → receive real mail on port **25** → read it via **HTTPS API**.

---

## Repo

| Path | What |
|------|------|
| `crates/http-server/` | Main binary: HTTP API + startup |
| `crates/smtp/` | Inbound SMTP |
| `crates/db/` | Postgres + SQL migrations |
| `ui/` | Next.js app |
| `deploy/` | EC2 setup (`setup.sh`, systemd unit) |
| `flake.nix` | Nix build (same as CI) |

More detail: [`crates/http-server/README.md`](crates/http-server/README.md), [`ui/README.md`](ui/README.md).

---

## Run locally

1. Postgres running (e.g. Docker on `localhost:5432`).
2. Copy [`.env.sample`](.env.sample) → `.env` and fill `DATABASE_URL`, `DOMAIN`. For dev, use `SMTP_PORT=2525` so you do not need port 25.
3. Backend: `cargo run -p http-server` (or `nix run .#backend` with flakes enabled).
4. UI: `cd ui && npm install && npm run dev` → open http://localhost:3000

---

## Production (short version)

**Flow:** Vercel UI calls `https://api.fake-email.site` → **Caddy** on EC2 (TLS) → app on `127.0.0.1:3001`. Mail hits **EC2:25** (MX → `mail.fake-email.site` → same IP).

**EC2 once:** Ubuntu, open ports **22, 25, 80, 443**, Elastic IP recommended.

```bash
git clone <repo> && cd fake-email
DATABASE_URL='postgres://…' VERCEL_ORIGIN='https://<app>.vercel.app' ./deploy/setup.sh
```

Then push to **`main`**: GitHub Actions builds the **Linux** binary with Nix, copies it to EC2, restarts the service.

**GitHub secrets:** `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`.

**DNS:** `A` for `api` and `mail` → your IP; `MX` for apex → `mail.fake-email.site`.

**Vercel:** `NEXT_PUBLIC_API_URL=https://api.fake-email.site` and set `CORS_ALLOWED_ORIGINS` on the server to your Vercel URL.

**Notes:** New AWS accounts may block port **25** until you ask AWS to lift it. `nix build` on a Mac is **not** the same binary as CI (Linux)—use the CI artifact for EC2.

---

## API

`GET /api/health` · `POST /api/temporary-address` · `GET /api/inbox/poll?address=…&since=…`

Inbox data is cleared on a **daily schedule** (default purge hour in deploy env is **3 UTC**); schema stays, migrations run once at startup.
