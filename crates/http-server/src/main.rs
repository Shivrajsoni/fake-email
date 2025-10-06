use crate::core::{AppConfig, AppState};
use axum::routing::delete;
use axum::{Router, routing::get as get_route, routing::post};
use dotenv::dotenv;
use sqlx::PgPool;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tower_http::cors::CorsLayer;

// Declare the modules we created.
mod api;
mod core;

#[tokio::main]
async fn main() {
    // Load environment variables from a .env file.
    dotenv().ok();

    // --- Configuration ---
    let app_config = AppConfig {
        domain: env::var("DOMAIN").unwrap_or_else(|_| "localhost".to_string()),
    };

    // --- Database Pool ---
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db_pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to create database pool");

    // Wrap the pool in an Arc for shared ownership
    let db_pool_arc = Arc::new(db_pool);

    // --- Shared Application State (for Axum) ---
    let app_state = AppState {
        db_pool: Arc::clone(&db_pool_arc), // Clone the Arc for the HTTP server
        config: app_config,
    };

    // --- Start SMTP Server ---
    let smtp_db_pool = Arc::clone(&db_pool_arc);
    tokio::spawn(async move {
        if let Err(e) = smtp_server::run_smtp_server(smtp_db_pool).await {
            eprintln!("SMTP server failed: {:?}", e);
        }
    });

    // --- Axum Router ---
    let app = Router::new()
        .route(
            "/api/email/generate",
            post(api::email::generate_email_handler),
        )
        .route(
            "/api/email/:address/summaries",
            get_route(api::email::list_email_summaries_handler),
        )
        .route(
            "/api/email/:address/:email_id",
            get_route(api::email::get_email_detail_handler),
        )
        .route(
            "/api/email/:address/:email_id",
            delete(api::email::delete_email_by_id),
        )
        .route(
            "/api/email/:address/all",
            delete(api::email::delete_all_emails_handler),
        )
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    // --- Start HTTP Server ---
    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    println!("HTTP Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    let server = axum::serve(listener, app);

    // Background cleanup task
    let cleanup_pool = Arc::clone(&db_pool_arc);
    tokio::spawn(async move {
        loop {
            if let Ok(deleted) =
                db::services::temp_address::delete_expired_temp_addresses(&cleanup_pool).await
            {
                if deleted > 0 {
                    println!("Cleanup: deleted {} expired temp addresses", deleted);
                }
            }
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });

    server.await.unwrap();
}
