# `http-server` — HTTP API for temporary mail

## Motivation

This service is the **public-facing control plane** for a disposable inbox product: create an address in one request, poll for new messages in another. We deliberately avoid accounts, API keys, and OAuth. **Possession of the full email address** is treated as sufficient to read that inbox, which matches how many throwaway-mail sites behave and keeps the first version simple.

The HTTP layer does not implement mail delivery. In production, **inbound SMTP** (a separate process or crate) must accept messages for your domain, validate recipients against `temporary_email`, and persist to `received_email`. This server only exposes what clients need to **provision** an address and **read** what has already been stored.

## How we implement it

### Stack

- **Axum** for routing, extractors, and JSON.
- **Tokio** for async I/O.
- **`db` crate** for `PgPool`, migrations, and SQL helpers — no raw `DATABASE_URL` handling duplicated here beyond what `db` does internally.

### Startup and readiness

The server binds immediately, but the database connection and migrations run in a **background task**. Until both succeed, `PgPool` is absent from shared state. `GET /api/health` returns **503** when the pool is not ready and **200** when it is, so load balancers and orchestrators can wait for a healthy instance before sending traffic.

Mail domain for generated addresses comes from **`MAIL_DOMAIN`**, with a fallback to **`DOMAIN`**, so the same deployment can separate website hostname from mailbox domain if needed.

### Address generation

`POST /api/temporary-address` accepts an optional `username`:

- If the client supplies a non-empty username, the **local part** uses up to five ASCII alphanumeric characters from it (normalized to lowercase), then **three** random alphanumeric characters, then `@` and the configured domain.
- If the username is missing or yields no usable characters, the local part is **five random** plus **three random** characters (still lowercase alphanumerics).

Collisions on `temp_email_addr` are possible in theory; the handler **retries** with a new random suffix a limited number of times before returning an error.

### Inbox polling (no push from this route)

The frontend is expected to **poll** on a timer. `GET /api/inbox/poll` takes:

| Query     | Meaning                                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `address` | Full temporary address (must contain `@`).                                                                                                                                                                                       |
| `since`   | Optional RFC 3339 timestamp. When set, only messages with `received_at` strictly **after** `since` are returned (incremental poll). When omitted, all stored messages for that address are returned (useful for the first load). |

The JSON response includes structured message rows, a `has_new` / `new_mail_count` summary, and `next_since` (the latest `received_at` in the batch) so the client can pass it back as `since` on the next poll and avoid re-fetching the same rows.

## API summary

| Method | Path                     | Description                                                                      |
| ------ | ------------------------ | -------------------------------------------------------------------------------- |
| `GET`  | `/api/health`            | Liveness / DB readiness.                                                         |
| `POST` | `/api/temporary-address` | Body: `{ "username": optional string }`. Returns `{ "temp_email_addr": "..." }`. |
| `GET`  | `/api/inbox/poll`        | Query: `address`, optional `since`. Returns poll envelope and `messages[]`.      |

Default listen address in code is `0.0.0.0:3001` (adjust in source or via deployment configuration if you externalize it).

## Environment variables

| Variable                  | Role                                                           |
| ------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`            | Used indirectly through the `db` crate when the pool connects. |
| `MAIL_DOMAIN` or `DOMAIN` | Domain appended to generated addresses (required at startup).  |
