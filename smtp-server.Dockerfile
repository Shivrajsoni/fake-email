# Stage 1: Build the application
FROM rust:1.73 as builder

# Create a new empty workspace
WORKDIR /usr/src/app
RUN cargo init --bin

# Copy the local dependencies
COPY ./crates/db /usr/src/app/crates/db
COPY ./crates/smtp-server /usr/src/app/crates/smtp-server

# Copy the Cargo.toml files
COPY ./Cargo.toml /usr/src/app/Cargo.toml
COPY ./crates/db/Cargo.toml /usr/src/app/crates/db/Cargo.toml
COPY ./crates/smtp-server/Cargo.toml /usr/src/app/crates/smtp-server/Cargo.toml

# Build the application
RUN cargo build --release --bin smtp-server

# Stage 2: Create the runtime image
FROM debian:buster-slim

# Copy the binary from the builder stage
COPY --from=builder /usr/src/app/target/release/smtp-server /usr/local/bin/smtp-server

# Set the command to run the application
CMD ["/usr/local/bin/smtp-server"]