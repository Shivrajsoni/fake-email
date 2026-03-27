# Same glibc family as debian:bookworm-slim runtime (see crates/db/Dockerfile).
FROM rust:1-bookworm AS builder

WORKDIR /app

# Linux containers are case-sensitive; keep canonical manifest name.
COPY Cargo.toml ./Cargo.toml
COPY crates/db/Cargo.toml crates/db/Cargo.toml
COPY crates/http-server/Cargo.toml crates/http-server/Cargo.toml
COPY crates/smtp-server/Cargo.toml crates/smtp-server/Cargo.toml

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

EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/http-server"]
