# Testing Guide

This project uses two levels of tests:

1. **Unit tests** (fast, no external services)
2. **Integration tests with Testcontainers** (real Postgres in Docker)

## Prerequisites

- Docker installed and running
- Rust toolchain installed

Quick Docker check:

```bash
docker ps
```

If Docker is unavailable, container-based tests in this repo will skip early and print a skip message.

## Run tests

From repository root:

```bash
cargo test -p db -p http-server
```

This runs:

- `db` integration tests in `crates/db/tests/integration.rs`
- `http-server` integration tests in `crates/http-server/tests/http_api.rs`

Frontend checks (from `ui/`):

```bash
npm run lint
npm run build
```

## What is covered

### DB tests (`crates/db/tests/integration.rs`)

- DB connection through `db::connect_pool`
- Migration execution through `db::run_migrations`
- Migration verification (tables exist)
- Temp address insertion (`insert_temporary_email`)
- Received email listing (`list_received_emails`) with and without `since`

### HTTP tests (`crates/http-server/tests/http_api.rs`)

- `POST /api/temporary-address` persists generated address
- `GET /api/inbox/poll` returns structured mailbox payload with seeded email rows

## How Testcontainers lifecycle works

- Each test starts a fresh Postgres container.
- The test uses mapped host port and builds a connection string.
- On test completion, container handle goes out of scope and container is automatically removed.

This gives production-like DB behavior without manually managing a local database.

## Notes

- Current codebase is PostgreSQL-specific (`PgPool`, Postgres SQL and migrations).
- If you want MySQL container tests, code must be extended for MySQL support first.
