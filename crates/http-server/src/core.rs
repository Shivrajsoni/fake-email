use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use db::services::error::ServiceError;
use serde_json::json;
use thiserror::Error;

// Define a struct to hold our application's shared state.
#[derive(Clone)]
pub struct AppState {
    pub db_pool: sqlx::PgPool,
    pub config: AppConfig, // Assuming a config struct
}

// A placeholder for your application's configuration.
#[derive(Clone)]
pub struct AppConfig {
    pub domain: String,
}

// Define a custom error type for our API.
#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Invalid input: {0}")]
    Validation(String),

    #[error("Database error")]
    Database(#[from] ServiceError),
}

// Implement `IntoResponse` for `ApiError` to convert it into an HTTP response.
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            ApiError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::Database(ServiceError::FailedToFindUniqueName(_)) => (
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
