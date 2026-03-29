# Multi-stage build: Debian Bookworm + slim runtime (same glibc family).
FROM rust:1-bookworm AS builder

WORKDIR /app

# Same `Cargo.toml` path requirement as http-server (Linux builds).
COPY Cargo.toml ./Cargo.toml
COPY crates/db/Cargo.toml crates/db/Cargo.toml
COPY crates/http-server/Cargo.toml crates/http-server/Cargo.toml
COPY crates/smtp-server/Cargo.toml crates/smtp-server/Cargo.toml

COPY .sqlx ./.sqlx
COPY crates/db/src crates/db/src
COPY crates/http-server/src crates/http-server/src
COPY crates/smtp-server/src crates/smtp-server/src

ENV SQLX_OFFLINE=true
RUN cargo build --release -p smtp-server

FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 app

COPY --from=builder /app/target/release/smtp-server /usr/local/bin/smtp-server

USER app

# Document common SMTP ports; real listener is SMTP_PORT (e.g. 2525 in Compose).
# For SMTP_PORT=25 with USER app, add cap_net_bind_service (see docker-compose comment).
EXPOSE 25
EXPOSE 2525
ENTRYPOINT ["/usr/local/bin/smtp-server"]
