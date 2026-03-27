# Multi-stage build: Debian Bookworm toolchain + slim runtime (matches glibc).
# Runs the same on Ubuntu, macOS, etc.: the engine executes Linux containers.
FROM rust:1-bookworm AS builder

WORKDIR /app

# Linux filesystems are case-sensitive — root workspace manifest must be Cargo.toml.
COPY Cargo.toml ./Cargo.toml
COPY crates/db/Cargo.toml crates/db/Cargo.toml
COPY crates/http-server/Cargo.toml crates/http-server/Cargo.toml
COPY crates/smtp-server/Cargo.toml crates/smtp-server/Cargo.toml

COPY .sqlx ./.sqlx
COPY crates/db/src crates/db/src
COPY crates/http-server/src crates/http-server/src
COPY crates/smtp-server/src crates/smtp-server/src

ENV SQLX_OFFLINE=true
RUN cargo build --release -p http-server

FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 app

COPY --from=builder /app/target/release/http-server /usr/local/bin/http-server

USER app

# Listener port comes from env PORT (Compose sets HTTP_PORT).
EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/http-server"]
