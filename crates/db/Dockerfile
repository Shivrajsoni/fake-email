# Must match runtime glibc: rust:latest often tracks newer Debian (e.g. GLIBC_2.39)
# while debian:bookworm-slim is older — sqlx would fail at runtime.
FROM rust:1-bookworm AS builder

WORKDIR /app

COPY Cargo.toml ./Cargo.toml
COPY crates/db/Cargo.toml crates/db/Cargo.toml
COPY crates/http-server/Cargo.toml crates/http-server/Cargo.toml
COPY crates/smtp-server/Cargo.toml crates/smtp-server/Cargo.toml
COPY migrations migrations

COPY crates/db/src crates/db/src
COPY crates/http-server/src crates/http-server/src
COPY crates/smtp-server/src crates/smtp-server/src

ENV SQLX_OFFLINE=true
RUN cargo install sqlx-cli --version 0.7.4 --no-default-features --features native-tls,postgres

FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/cargo/bin/sqlx /usr/local/bin/sqlx
COPY migrations /app/migrations

ENTRYPOINT ["sqlx", "migrate", "run"]
