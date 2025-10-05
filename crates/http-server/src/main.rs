use crate::core::{AppConfig, AppState};
use axum::{Router, routing::post};
use dotenv::dotenv;
use sqlx::PgPool;
use std::env;
use std::net::SocketAddr;
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

    // --- Shared Application State ---
    let app_state = AppState {
        db_pool,
        config: app_config,
    };

    let app = Router::new()
        .route(
            "/api/email/generate",
            post(api::email::generate_email_handler),
        )
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    // --- Start Server ---
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await;
}
