# Filename: http-server.Dockerfile

# === Stage 1: Build Environment ===
# Use the same Nixpacks base image to get Nix and other build tools.
FROM ghcr.io/railwayapp/nixpacks:ubuntu-1741046653
WORKDIR /app

# Copy the .nixpacks directory which defines our Rust toolchain
COPY .nixpacks .nixpacks
# Install the Nix environment
RUN nix-env -if .nixpacks/nixpkgs-ef56e777fedaa4da8c66a150081523c5de1e0171.nix && nix-collect-garbage -d

# Copy the entire source code into the build container.
COPY . .

# Build ONLY the http-server binary in release mode.
# This is more efficient than building the whole workspace if you don't need it.
RUN --mount=type=cache,id=cargo-git,target=/root/.cargo/git \
    --mount=type=cache,id=cargo-registry,target=/root/.cargo/registry \
    --mount=type=cache,id=cargo-target,target=/app/target \
    cargo build --release --bin http-server

# === Stage 2: Runtime Environment ===
# Start from a minimal, clean Ubuntu image.
FROM ubuntu:jammy
WORKDIR /app

# Copy the compiled binary from the build stage.
COPY --from=0 /app/target/release/http-server .
# Copy migration files for running migrations from the container
COPY migrations ./migrations

# The command to run when the container starts.
CMD ["./http-server"]
