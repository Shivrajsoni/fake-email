use crate::core::{AppConfig, AppState};
use axum::{
    routing::{delete, get, post},
    Router,
};
use dotenvy::dotenv;
use sqlx::PgPool;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tower_http::cors::CorsLayer;
use tracing::{error, info};

// Declare the modules we created.
mod api;
mod core;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables from a .env file.
    dotenv().ok();
    // Use a JSON logger for production-ready structured logging
    tracing_subscriber::fmt().json().init();

    // --- Configuration ---
    let app_config = AppConfig {
        domain: env::var("DOMAIN").expect("DOMAIN must be set"),
    };
    let port = env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3001);

    // --- Database Pool ---
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db_pool = match PgPool::connect(&database_url).await {
        Ok(pool) => {
            info!("Database pool created successfully.");
            pool
        }
        Err(e) => {
            error!("Failed to create database pool: {}", e);
            return Err(e.into());
        }
    };

    // Wrap the pool in an Arc for shared ownership
    let db_pool_arc = Arc::new(db_pool);

    // --- Shared Application State (for Axum) ---
    let app_state = AppState {
        db_pool: Arc::clone(&db_pool_arc), // Clone the Arc for the HTTP server
        config: app_config,
    };

    // --- Axum Router ---
    let app = Router::new()
        .route("/api/email/generate", post(api::email::generate_email_handler))
        .route(
            "/api/email/:address/summaries",
            get(api::email::list_email_summaries_handler),
        )
        .route(
            "/api/email/:address/all",
            delete(api::email::delete_all_emails_handler),
        )
        .route(
            "/api/email/:address/:email_id",
            get(api::email::get_email_detail_handler).delete(api::email::delete_email_by_id),
        )
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    // --- Start HTTP Server ---
    // Bind to 0.0.0.0 to be reachable in a container
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            info!("HTTP Server listening on {}", addr);
            listener
        }
        Err(e) => {
            error!("Failed to bind to address {}: {}", addr, e);
            return Err(e.into());
        }
    };
    let server = axum::serve(listener, app);

    // Background cleanup task
    let cleanup_pool = Arc::clone(&db_pool_arc);
    tokio::spawn(async move {
        loop {
            if let Ok(deleted) =
                db::services::temp_address::delete_expired_temp_addresses(&cleanup_pool).await
            {
                if deleted > 0 {
                    info!("Cleanup: deleted {} expired temp addresses", deleted);
                }
            }
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });

    if let Err(e) = server.await {
        error!("Server error: {}", e);
    }

    Ok(())
}
