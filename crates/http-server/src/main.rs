mod address;
mod api;

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use db::{connect_pool, run_migrations};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct AppState {
    pub pool: Arc<RwLock<Option<PgPool>>>,
    pub mail_domain: Arc<str>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let pool_slot: Arc<RwLock<Option<PgPool>>> = Arc::new(RwLock::new(None));
    let pool_slot_bg = Arc::clone(&pool_slot);

    tokio::spawn(async move {
        let pool = match connect_pool().await {
            Ok(p) => {
                tracing::info!("database pool connected");
                p
            }
            Err(e) => {
                tracing::error!(error = %e, "database connection failed");
                return;
            }
        };
        match run_migrations(&pool).await {
            Ok(()) => {
                tracing::info!("database migrations applied");
                *pool_slot_bg.write().await = Some(pool);
            }
            Err(e) => tracing::error!(error = %e, "database migration failed"),
        }
    });

    let mail_domain: Arc<str> = std::env::var("MAIL_DOMAIN")
        .or_else(|_| std::env::var("DOMAIN"))
        .expect("MAIL_DOMAIN or DOMAIN must be set for address generation")
        .into_boxed_str()
        .into();

    let state = AppState {
        pool: pool_slot,
        mail_domain,
    };

    let app = Router::new()
        .route("/api/health", get(health_check))
        .route(
            "/api/temporary-address",
            post(api::create_temporary_address),
        )
        .route("/api/inbox/poll", get(api::poll_inbox_by_address))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    let guard = state.pool.read().await;
    match guard.as_ref() {
        Some(_) => (StatusCode::OK, "OK"),
        None => (StatusCode::SERVICE_UNAVAILABLE, "database not ready"),
    }
}
