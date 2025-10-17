#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Install Rust --- 
if ! command -v rustc &> /dev/null
then
    echo "Rust is not installed. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "Rust is already installed."
fi

# --- Install sqlx-cli --- 
if ! command -v sqlx &> /dev/null
then
    echo "sqlx-cli is not installed. Installing sqlx-cli..."
    cargo install sqlx-cli
else
    echo "sqlx-cli is already installed."
fi

# --- Setup .env file ---
if [ ! -f .env ]; then
    echo "Creating .env file from .env.sample..."
    cp .env.sample .env
    echo "Please update the .env file with your database credentials."
else
    echo ".env file already exists."
fi

# --- Build the project ---
echo "Building the project in release mode..."
cargo build --release

echo "Setup complete!"

echo "You can now run the services using the following commands:"
echo "To run the http-server: cargo run --release --bin http-server"
echo "To run the smtp-server: cargo run --release --bin smtp-server"
