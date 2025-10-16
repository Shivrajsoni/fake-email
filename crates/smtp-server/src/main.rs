use smtp_server::run_smtp_server;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tracing::{error, info};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file. Ignore error if it's not present, as env vars can be set directly.
    dotenvy::dotenv().ok();
    // Use a JSON logger for production-ready structured logging.
    tracing_subscriber::fmt().json().init();

    let db_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env or environment");

    // Create a database connection pool.
    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
    {
        Ok(pool) => {
            info!("Database pool created successfully.");
            pool
        }
        Err(e) => {
            error!("Failed to create database pool: {}", e);
            return Err(Box::new(e));
        }
    };

    info!("Starting SMTP server...");

    // Start the SMTP server.
    if let Err(e) = run_smtp_server(Arc::new(pool)).await {
        error!("SMTP server error: {}", e);
    }

    Ok(())
}