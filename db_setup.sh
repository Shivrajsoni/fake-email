#!/bin/bash

# This script automates the setup of the PostgreSQL database for the fake-email project.

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
DB_CONTAINER_NAME="temp_email_db"
POSTGRES_USER="shivraj"
POSTGRES_PASSWORD="root"
POSTGRES_DB="temp_email_db"
DB_PORT="5432"

# --- Main Logic ---

# 1. Stop and remove the old container if it exists to ensure a clean start.
if [ "$(docker ps -q -f name=^/${DB_CONTAINER_NAME}$)" ]; then
    echo "Stopping existing '${DB_CONTAINER_NAME}' container..."
    docker stop "${DB_CONTAINER_NAME}"
fi

if [ "$(docker ps -aq -f status=exited -f name=^/${DB_CONTAINER_NAME}$)" ]; then
    echo "Removing existing '${DB_CONTAINER_NAME}' container..."
    docker rm "${DB_CONTAINER_NAME}"
fi

# 2. Start a new PostgreSQL container in the background.
echo "Starting new '${DB_CONTAINER_NAME}' container..."
docker run -d \
  --name "${DB_CONTAINER_NAME}" \
  -e POSTGRES_USER="${POSTGRES_USER}" \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  -e POSTGRES_DB="${POSTGRES_DB}" \
  -p "${DB_PORT}:5432" \
  postgres

# 3. Wait for the database to initialize.
echo "Waiting for database to initialize (5 seconds)..."
sleep 5

# 4. Set the DATABASE_URL for the migration tool.
export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/${POSTGRES_DB}"

# 5. Run the database migrations using sqlx-cli.
#    Note: This requires sqlx-cli to be installed.
#    If you don't have it, run: cargo install sqlx-cli
echo "Running database migrations..."
sqlx migrate run

echo "✅ Database setup and migration complete."
