# Filename: smtp-server.Dockerfile

# === Stage 1: Build Environment ===
FROM ghcr.io/railwayapp/nixpacks:ubuntu-1741046653
WORKDIR /app

COPY .nixpacks .nixpacks
RUN nix-env -if .nixpacks/nixpkgs-ef56e777fedaa4da8c66a150081523c5de1e0171.nix && nix-collect-garbage -d

COPY . .

# Build ONLY the smtp-server binary.
RUN --mount=type=cache,id=cargo-git,target=/root/.cargo/git \
    --mount=type=cache,id=cargo-registry,target=/root/.cargo/registry \
    --mount=type=cache,id=cargo-target,target=/app/target \
    cargo build --release --bin smtp-server

# === Stage 2: Runtime Environment ===
FROM ubuntu:jammy
WORKDIR /app

# Copy the compiled smtp-server binary.
COPY --from=0 /app/target/release/smtp-server .

# The command to run the SMTP server.
CMD ["./smtp-server"]

