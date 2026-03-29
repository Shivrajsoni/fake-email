# sqlx CLI only — no workspace compile. Builder and runtime use Debian Bookworm
# (same glibc family) so the copied binary runs on debian:bookworm-slim.
# Docker on Ubuntu Server uses these Linux images like any other host.
FROM rust:1-bookworm AS builder

ENV CARGO_BUILD_JOBS=1
RUN cargo install sqlx-cli --version 0.7.4 --no-default-features --features native-tls,postgres \
    && rm -rf /usr/local/cargo/registry /usr/local/cargo/git

FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/cargo/bin/sqlx /usr/local/bin/sqlx
COPY migrations /app/migrations

ENTRYPOINT ["sqlx", "migrate", "run"]
