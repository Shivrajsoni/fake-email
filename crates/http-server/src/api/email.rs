// POST endpoint api/email/generate

use crate::core::{ApiError, AppState};
use axum::{
    Json,
    extract::{Path, Query, State},
};
use db::{
    models::{
        email::{EmailDetail, EmailSummary},
        temp_address::{TempEmailRequest, TempEmailResponse},
    },
    services::{
        email::{
            create_temporary_email, delete_email_by_id_handler, get_email_detail_by_address,
            list_email_summaries_by_address,
        },
        temp_address::find_by_address,
    },
};
use serde::Deserialize;
use db::services::email::delete_all_emails_by_address;
use serde::Serialize;
use uuid::Uuid;

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
        .unwrap_or(1440)
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

    // 4. Transform the database model into the API response DTO.s
    let response = TempEmailResponse {
        address: temp_email.address,
        // The `created_at` field is now already a `DateTime<Utc>`.
        created_at: temp_email.created_at,
        // Calculate expiry_in_sec from the TTL to avoid clock skew issues.
        expiry_in_sec: ttl_minutes * 60,
    };

    Ok(Json(response))
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

#[derive(Deserialize)]
pub struct ListQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /api/email/:address/summaries
#[axum::debug_handler]
pub async fn list_email_summaries_handler(
    State(app_state): State<AppState>,
    Path(address): Path<String>,
    Query(p): Query<ListQuery>,
) -> Result<Json<Vec<EmailSummary>>, ApiError> {
    let exists = find_by_address(&app_state.db_pool, &address)
        .await
        .map_err(db_error_to_api)?;
    if exists.is_none() {
        return Err(ApiError::NotFound(
            "Temporary address not found or expired".to_string(),
        ));
    }
    let limit = p.limit.unwrap_or(50).clamp(1, 200);
    let offset = p.offset.unwrap_or(0).max(0);
    let items = list_email_summaries_by_address(&app_state.db_pool, &address, limit, offset)
        .await
        .map_err(db_error_to_api)?;
    Ok(Json(items))
}

/// GET /api/email/:address/:email_id
#[axum::debug_handler]
pub async fn get_email_detail_handler(
    State(app_state): State<AppState>,
    Path((address, email_id)): Path<(String, Uuid)>,
) -> Result<Json<EmailDetail>, ApiError> {
    let exists = find_by_address(&app_state.db_pool, &address)
        .await
        .map_err(db_error_to_api)?;
    if exists.is_none() {
        return Err(ApiError::NotFound(
            "Temporary address not found or expired".to_string(),
        ));
    }
    let item = get_email_detail_by_address(&app_state.db_pool, &address, email_id)
        .await
        .map_err(db_error_to_api)?
        .ok_or_else(|| ApiError::Validation("Email not found for this address".to_string()))?;
    Ok(Json(item))
}

fn db_error_to_api(e: sqlx::Error) -> ApiError {
    ApiError::Database(db::services::error::ServiceError::DatabaseError(e))
}

/// DELETE /api/email/:address/:email_id
#[axum::debug_handler]
pub async fn delete_email_by_id(
    State(app_state): State<AppState>,
    Path((address, email_id)): Path<(String, Uuid)>,
) -> Result<Json<EmailDetail>, ApiError> {
    // First, check if the temporary address exists and is valid
    let exists = find_by_address(&app_state.db_pool, &address)
        .await
        .map_err(db_error_to_api)?;

    if exists.is_none() {
        return Err(ApiError::NotFound(
            "Temporary address not found or expired".to_string(),
        ));
    }

    // Call the service layer to delete the email
    let deleted_item = delete_email_by_id_handler(&app_state.db_pool, &address, email_id)
        .await
        .map_err(db_error_to_api)?;

    // Return the deleted email details or error if not found
    match deleted_item {
        Some(email_detail) => Ok(Json(email_detail)),
        None => Err(ApiError::NotFound(
            "Email not found for this address".to_string(),
        )),
    }
}

#[derive(Serialize)]
pub struct DeleteAllResponse {
    pub deleted_count: u64,
}

/// DELETE /api/email/:address/all
#[axum::debug_handler]
pub async fn delete_all_emails_handler(
    State(app_state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<DeleteAllResponse>, ApiError> {
    // First, check if the temporary address exists and is valid
    let exists = find_by_address(&app_state.db_pool, &address)
        .await
        .map_err(db_error_to_api)?;

    if exists.is_none() {
        return Err(ApiError::NotFound(
            "Temporary address not found or expired".to_string(),
        ));
    }

    // Now, proceed with deletion
    let deleted_count = delete_all_emails_by_address(&app_state.db_pool, &address)
        .await
        .map_err(db_error_to_api)?;

    Ok(Json(DeleteAllResponse { deleted_count }))
}
