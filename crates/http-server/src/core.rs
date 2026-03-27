use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use db::services::error::DbError;
use serde_json::json;
use std::sync::Arc;
use thiserror::Error;

#[derive(Clone)]
pub struct AppState {
    pub db_pool: Arc<sqlx::PgPool>,
    pub config: AppConfig,
}

#[derive(Clone)]
pub struct AppConfig {
    pub domain: String,
}

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Invalid input: {0}")]
    Validation(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error(transparent)]
    Database(#[from] DbError),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            ApiError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            ApiError::Database(DbError::FailedToFindUniqueAddress(_)) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Could not generate a unique email address.".to_string(),
            ),
            ApiError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "An unexpected database error occurred.".to_string(),
            ),
        };

        let body = Json(json!({ "error": error_message }));
        (status, body).into_response()
    }
}
