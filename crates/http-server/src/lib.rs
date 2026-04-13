pub mod api;

use axum::{
    extract::State,
    http::{header, HeaderValue, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tower_http::cors::{AllowOrigin, CorsLayer};

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
        .layer(build_cors_layer())
        .with_state(state)
}

async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    match state.pool.read().await.as_ref() {
        Some(_) => (StatusCode::OK, "OK"),
        None => (StatusCode::SERVICE_UNAVAILABLE, "database not ready"),
    }
}

fn build_cors_layer() -> CorsLayer {
    let raw = std::env::var("CORS_ALLOWED_ORIGINS").unwrap_or_default();
    let origins: Vec<HeaderValue> = raw
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .filter_map(|s| HeaderValue::from_str(s).ok())
        .collect();

    if origins.is_empty() {
        tracing::warn!("CORS_ALLOWED_ORIGINS is empty — cross-origin requests will be blocked");
        return CorsLayer::new();
    }

    tracing::info!(origins = %raw.trim(), "CORS enabled");

    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT])
        .max_age(Duration::from_secs(86400))
}
