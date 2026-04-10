# `db` — database layer

## Why this crate exists

Disposable temporary email needs a **durable place** to record which addresses are valid and what messages arrived for them. The `db` crate is that layer: it owns the **PostgreSQL schema**, **embedded migrations**, **connection pooling**, and **typed access patterns** (models and repository-style queries) used by the HTTP API and, in the same workspace, by the SMTP receiver once it writes inbound mail.

We keep this logic in a dedicated crate so the HTTP server stays thin (routing and HTTP concerns only) and so any other binary (for example an SMTP daemon) can reuse the same types and queries without duplicating SQL.

## What we are building toward

- **Temporary inboxes** — Each row in `temporary_email` is a mailbox identity (`temp_email_addr` is unique). Users receive a full address they can paste into signup forms.
- **Stored messages** — Rows in `received_email` belong to exactly one temporary inbox via foreign key, with **ON DELETE CASCADE** so removing an inbox removes its messages.
- **Operational simplicity** — Schema is applied automatically at runtime via sqlx’s embedded migrator (`sqlx::migrate!`), so a fresh environment does not require a separate migration step beyond having `DATABASE_URL` set.

The database is intentionally generic: it does not enforce business rules such as TTL purges or rate limits; those remain policy decisions at the application or operations level.

## How it works

### Connection

`connect_pool()` reads `DATABASE_URL` from the environment (after `dotenvy` loads a local `.env` if present), builds a `PgPool` with a small max connection count, and returns it for async use across the process.

### Migrations

SQL files live under `crates/db/migrations/` and are compiled into the binary. `run_migrations(pool)` applies any pending versions in order. This matches the common pattern of **schema as code**, versioned with the application.

If your database was created with an older migration set (extra files such as NOTIFY trigger steps), `sqlx` may report checksum or version mismatches. Fix by pointing at a fresh database, or by dropping `_sqlx_migrations` and reconciling the schema manually before re-running migrations.

### Schema (summary)

| Table             | Role                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `temporary_email` | Registered disposable address (`temp_email_addr` unique), `created_at` for auditing and future policies. |
| `received_email`  | Message metadata and body text linked to `temporary_email_id`; indexed for inbox listing.                |

An additional index on `temporary_email(created_at)` supports time-oriented queries if you add retention or reporting later.

### Rust surface

- **Models** — `TemporaryEmail` and `ReceivedEmail` implement `sqlx::FromRow` (and serde where needed) so query results map cleanly to structs.
- **Repository functions** — Inserts, lookup by address, lookup by id, and listing received mail with an optional `since` timestamp for incremental reads.

Consumers import this crate as `db` and call the exported functions with a `&PgPool`.

## Environment

| Variable       | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection URI (required for `connect_pool`). |

Any managed Postgres (RDS, Supabase, Neon, self-hosted, etc.) is fine as long as the URL is valid and the role can create or alter objects according to your migration policy.

## Related crates

- **`http-server`** — Calls `connect_pool`, `run_migrations`, and the repository helpers for the public API.
- **`smtp`** — Intended to accept mail for your configured domain and insert rows into `received_email` for matching `temporary_email` addresses.
