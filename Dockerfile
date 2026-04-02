FROM rust:1.88-bookworm AS builder
WORKDIR /app

COPY Cargo.toml ./Cargo.toml
COPY crates ./crates
COPY migrations ./migrations

RUN cargo test -p smtp-server -- --skip integration
RUN cargo build --release -p http-server

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/http-server /usr/local/bin/http-server
COPY migrations ./migrations

ENV DOMAIN=fake-email.site
ENV HTTP_HOST=0.0.0.0
ENV HTTP_PORT=3001
ENV SMTP_HOST=0.0.0.0
ENV SMTP_PORT=587

EXPOSE 3001 587
CMD ["http-server"]
