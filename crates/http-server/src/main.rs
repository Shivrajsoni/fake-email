use crate::core::{AppConfig, AppState};
use axum::{
    routing::{delete, get, post},
    Router,
};
use db::{background, pool};
use dotenvy::dotenv;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;

mod api;
mod core;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    tracing_subscriber::fmt().json().init();

    let app_config = AppConfig {
        domain: env::var("DOMAIN").expect("DOMAIN must be set"),
    };
    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3001);

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db_pool = pool::connect(&database_url).await?;
    info!("database pool ready");
    let db_pool_arc = Arc::new(db_pool);

    background::spawn_periodic_data_reset(Arc::clone(&db_pool_arc));

    let app_state = AppState {
        db_pool: Arc::clone(&db_pool_arc),
        config: app_config,
    };

    let app = Router::new()
        .route("/api/email/generate", post(api::email::generate_mailbox))
        .route(
            "/api/email/:address/summaries",
            get(api::email::list_messages),
        )
        .route("/api/email/:address/all", delete(api::email::purge_inbox))
        .route(
            "/api/email/:address/:email_id",
            get(api::email::get_message).delete(api::email::delete_message),
        )
        .route("/api/health", get(|| async { axum::http::StatusCode::OK }))
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!(%addr, "http listening");
    axum::serve(listener, app).await?;
    Ok(())
}
