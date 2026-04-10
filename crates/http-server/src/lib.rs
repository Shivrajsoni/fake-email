//! HTTP API: [`AppState`], [`router`], and [`api`] handlers.

pub mod api;

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct AppState {
    pub pool: Arc<RwLock<Option<PgPool>>>,
    pub mail_domain: Arc<str>,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(health_check))
        .route("/api/temporary-address", post(api::create_temporary_address))
        .route("/api/inbox/poll", get(api::poll_inbox_by_address))
        .with_state(state)
}

async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    match state.pool.read().await.as_ref() {
        Some(_) => (StatusCode::OK, "OK"),
        None => (StatusCode::SERVICE_UNAVAILABLE, "database not ready"),
    }
}
