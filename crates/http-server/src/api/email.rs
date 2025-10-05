// POST endpoint api/email/generate

use crate::core::{ApiError, AppState};
use axum::{Json, extract::State};
use chrono::{DateTime, Utc};
use db::{
    models::{
        email::{EmailDetail, EmailSummary},
        temp_address::{TempEmailRequest, TempEmailResponse},
    },
    services::email::create_temporary_email,
};

const MIN_TTL_MINUTES: u64 = 10;
const MAX_TTL_MINUTES: u64 = 1440; // 24 hours

/// Handles the request to generate a new temporary email address.
#[axum::debug_handler]
pub async fn generate_email_handler(
    State(app_state): State<AppState>,
    Json(payload): Json<TempEmailRequest>,
) -> Result<Json<TempEmailResponse>, ApiError> {
    // 1. Validate Input
    if let Some(ref username) = payload.username {
        validate_username(username)?;
    }

    // 2. Apply TTL (Time-To-Live) logic, clamping the value to a safe range.
    let ttl_minutes = payload
        .ttl_minutes
        .unwrap_or(360)
        .clamp(MIN_TTL_MINUTES, MAX_TTL_MINUTES);

    // 3. Call the database service to create the email.
    // The `?` operator will automatically convert a `ServiceError` into our `ApiError`
    // thanks to the `#[from]` attribute in the `ApiError` enum.
    let temp_email = create_temporary_email(
        &app_state.db_pool,
        payload.username,
        ttl_minutes as i64, // Cast u64 to i64 for the service function
        &app_state.config.domain,
    )
    .await?;

    // 4. Transform the database model into the API response DTO.
    let response = TempEmailResponse {
        address: temp_email.address,
        // Convert the NaiveDateTime from the DB to a timezone-aware DateTime<Utc>.
        created_at: DateTime::from_naive_utc_and_offset(temp_email.created_at, Utc),
        // Calculate expiry_in_sec from the TTL to avoid clock skew issues.
        expiry_in_sec: ttl_minutes * 60,
    };

    Ok(Json(response))
}

pub async fn create_email_handler(
    State(app_state): State<AppState>,
    Json(payload): Json<EmailDetail>,
) -> Result<Json<EmailSummary>, ApiError> {
}

/// Validates the username, checking for length and allowed characters.
fn validate_username(username: &str) -> Result<(), ApiError> {
    if username.len() < 3 || username.len() > 20 {
        return Err(ApiError::Validation(
            "Username must be between 3 and 20 characters.".to_string(),
        ));
    }
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err(ApiError::Validation(
            "Username can only contain alphanumeric characters and underscores.".to_string(),
        ));
    }
    Ok(())
}
