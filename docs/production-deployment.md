# Production deployment guidelines

This document describes **best practices** for running **fake-email** (HTTP API, SMTP receiver, Postgres) in production. It complements `./start.sh` / `docker-compose.yml`, which target a working local or single-host setup.

---

## 1. Architecture expectations

- **http-server**: REST API (Axum). Binds `0.0.0.0` on `PORT` (Compose default `HTTP_PORT`, often `3001`).
- **smtp-server**: Inbound SMTP for addresses under `DOMAIN`. Listens on `SMTP_PORT` (default `2525` in Compose; many providers use **25** with elevated privileges or a relay).
- **postgres**: Data store. App containers use `postgres:5432` on the **internal** Docker network only in the default Compose file.

Treat **HTTP** and **SMTP** as internet-facing only behind the controls you choose (firewall, load balancer, reverse proxy).

---

## 2. Secrets and configuration

- **Never** bake secrets into images. Use environment injection (Compose secrets, Kubernetes secrets, your host’s secret manager).
- **Rotate** `POSTGRES_PASSWORD` and any API keys if you add auth later.
- **`.env` on servers**: restrict file permissions (`chmod 600`), exclude from backups that are less trusted than the DB.
- **`DOMAIN`**: must match the **recipient domain** you advertise in DNS (MX) for inbound mail. HTTP and SMTP code both expect `DOMAIN` to be set consistently.
- **`DATABASE_URL`**: in production, prefer a **managed Postgres** URL with TLS (`sslmode=require` or stricter) rather than default dev-style `sslmode=disable`.

Document every required variable for your environment (mirror `.env.sample` + Compose overrides).

---

## 3. Database

- Prefer **managed Postgres** (RDS, Cloud SQL, Neon, etc.) for backups, patching, and HA.
- **Backups**: automated, tested restores, retention policy.
- **Migrations**: run **before** or as part of a **controlled release** (your `db-migrate` image / `sqlx migrate run`). Ensure only one migration runner wins in multi-node deploys (job queue, init container, or release phase).
- **Do not** expose Postgres to the public internet. Bind to private networks / VPC only.
- Remove or avoid publishing `POSTGRES_HOST_PORT` in production Compose if nothing on the host needs direct DB access.

---

## 4. Docker and images

- **Pin image digests or minor versions** in Compose (e.g. `postgres:16-alpine` → pin to a tested digest) for reproducible deploys.
- **Builder vs runtime glibc**: Rust binaries and `sqlx` must be built on a **compatible** libc with the runtime image (this repo uses `rust:1-bookworm` → `debian:bookworm-slim` for that reason). Do not copy binaries from arbitrary `rust:latest` into older Debian runtimes.
- **Rebuild and redeploy** on security patches to the base OS and dependencies.
- Run application containers as **non-root** where possible (already done for http/smtp images in this repo).

---

## 5. TLS and reverse proxy (HTTP)

- Terminate **HTTPS** at a reverse proxy or load balancer (**Caddy**, **Traefik**, **nginx**, cloud LB).
- Proxy to the API over **HTTP on the private network** only; do not expose plain HTTP to clients.
- Tighten **CORS** in the application for production (the current API uses permissive CORS, which is convenient for dev but broad for prod).
- Set sensible **request body / timeout** limits at the proxy if you add upload-heavy routes later.

---

## 6. SMTP in production

- **MX records** must point to hosts that can reach your SMTP listener on the port you expose (often **25** on the public internet for inter-server mail).
- **Port 25** is often blocked on consumer clouds or requires explicit allowlisting; plan firewall and provider rules.
- **`SMTP_BANNER_HOST`**: set to a stable, valid hostname for your service (helps with some anti-spam heuristics and troubleshooting).
- **Rate limiting** and **abuse controls** at the edge (connection limits, tarpitting policy via proxy or dedicated MTA front-end) reduce spam and resource exhaustion.
- This service is **inbound receive** oriented; outbound deliverability (SPF/DKIM for *sending*) is a separate concern if you add outbound mail later.

---

## 7. Releases and migrations

- **Order**: migrate compatible schema **before** switching traffic to new app versions that depend on new columns/tables (or use backward-compatible migrations).
- **Rollback plan**: keep previous image tags; know how to revert migrations if your tooling supports down migrations (sqlx tracks applied migrations—plan accordingly).
- **Zero-downtime**: for multiple HTTP replicas, use a load balancer; ensure DB pool sizes × replicas fit Postgres `max_connections`.

---

## 8. Observability and operations

- Logs are **JSON**-oriented (tracing); ship them to a centralized system (CloudWatch, Loki, Datadog, etc.).
- Expose or check **`/api/health`** from your load balancer or an uptime monitor.
- Define **SLOs** (availability, error rate) and alerts on DB connectivity, disk, and SMTP accept errors.

---

## 9. Security checklist (minimal)

- [ ] HTTPS for all public API traffic  
- [ ] Strong, unique DB password; TLS to Postgres where supported  
- [ ] Postgres not reachable from the internet  
- [ ] Secrets not in git or images  
- [ ] Firewall: only required ports open (443 → proxy, 25/SMTP if receiving mail)  
- [ ] Regular image and OS updates  
- [ ] Review CORS and add rate limiting / WAF as needed for a disposable-mailbox product  

---

## 10. Beyond single-host Compose

For real production clusters, most teams move to:

- **Kubernetes** / **ECS** / **Nomad** with separate Deployments for http and smtp  
- **Managed Postgres** instead of a container volume  
- **External secrets** and **IaC** (Terraform, Pulumi) for networks and DNS  

The same principles above still apply; only the orchestration layer changes.
