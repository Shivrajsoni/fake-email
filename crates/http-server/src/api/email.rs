use crate::api::dtos::{
    EmailDetailResponse, EmailSummaryResponse, GenerateMailboxRequest, GenerateMailboxResponse,
    PurgeInboxResponse,
};
use crate::core::{ApiError, AppState};
use axum::{
    Json,
    extract::{Path, Query, State},
};
use db::{
    services::{
        email::{delete_all_for_mailbox, delete_for_mailbox, get_for_mailbox, list_for_mailbox},
        temp_address::{create, find_by_address},
    },
    validation::{validate_local_part, LocalPartValidationError},
};
use serde::Deserialize;
use uuid::Uuid;

const MIN_TTL_MINUTES: u64 = 10;
const MAX_TTL_MINUTES: u64 = 1440;

const NOT_FOUND_MAILBOX: &str = "Temporary address not found or expired";

fn map_local_part_err(e: LocalPartValidationError) -> ApiError {
    let msg = match e {
        LocalPartValidationError::TooShort | LocalPartValidationError::TooLong => {
            "Username must be between 3 and 20 characters.".to_string()
        }
        LocalPartValidationError::InvalidCharacters => {
            "Username can only contain alphanumeric characters and underscores.".to_string()
        }
    };
    ApiError::Validation(msg)
}

#[axum::debug_handler]
pub async fn generate_mailbox(
    State(app_state): State<AppState>,
    Json(payload): Json<GenerateMailboxRequest>,
) -> Result<Json<GenerateMailboxResponse>, ApiError> {
    if let Some(ref username) = payload.username {
        validate_local_part(username).map_err(map_local_part_err)?;
    }

    let ttl_minutes = payload
        .ttl_minutes
        .unwrap_or(MAX_TTL_MINUTES)
        .clamp(MIN_TTL_MINUTES, MAX_TTL_MINUTES);

    let row = create(
        &app_state.db_pool,
        payload.username,
        ttl_minutes as i64,
        &app_state.config.domain,
    )
    .await?;

    Ok(Json(GenerateMailboxResponse {
        address: row.address,
        created_at: row.created_at,
        expiry_in_sec: ttl_minutes * 60,
    }))
}

#[derive(Deserialize)]
pub struct ListQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /api/email/:address/summaries
#[axum::debug_handler]
pub async fn list_messages(
    State(app_state): State<AppState>,
    Path(address): Path<String>,
    Query(p): Query<ListQuery>,
) -> Result<Json<Vec<EmailSummaryResponse>>, ApiError> {
    let mailbox = find_by_address(&app_state.db_pool, &address)
        .await?
        .ok_or_else(|| ApiError::NotFound(NOT_FOUND_MAILBOX.to_string()))?;

    let limit = p.limit.unwrap_or(50).clamp(1, 200);
    let offset = p.offset.unwrap_or(0).max(0);
    let items = list_for_mailbox(&app_state.db_pool, mailbox.id, limit, offset).await?;
    let out = items.into_iter().map(EmailSummaryResponse::from).collect();
    Ok(Json(out))
}

/// GET /api/email/:address/:email_id
#[axum::debug_handler]
pub async fn get_message(
    State(app_state): State<AppState>,
    Path((address, email_id)): Path<(String, Uuid)>,
) -> Result<Json<EmailDetailResponse>, ApiError> {
    let mailbox = find_by_address(&app_state.db_pool, &address)
        .await?
        .ok_or_else(|| ApiError::NotFound(NOT_FOUND_MAILBOX.to_string()))?;

    let item = get_for_mailbox(&app_state.db_pool, mailbox.id, email_id)
        .await?
        .ok_or_else(|| ApiError::Validation("Email not found for this address".to_string()))?;
    Ok(Json(EmailDetailResponse::from(item)))
}

/// DELETE /api/email/:address/:email_id
#[axum::debug_handler]
pub async fn delete_message(
    State(app_state): State<AppState>,
    Path((address, email_id)): Path<(String, Uuid)>,
) -> Result<Json<EmailDetailResponse>, ApiError> {
    let mailbox = find_by_address(&app_state.db_pool, &address)
        .await?
        .ok_or_else(|| ApiError::NotFound(NOT_FOUND_MAILBOX.to_string()))?;

    let deleted = delete_for_mailbox(&app_state.db_pool, mailbox.id, email_id)
        .await?
        .ok_or_else(|| ApiError::NotFound("Email not found for this address".to_string()))?;
    Ok(Json(EmailDetailResponse::from(deleted)))
}

/// DELETE /api/email/:address/all
#[axum::debug_handler]
pub async fn purge_inbox(
    State(app_state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<PurgeInboxResponse>, ApiError> {
    let mailbox = find_by_address(&app_state.db_pool, &address)
        .await?
        .ok_or_else(|| ApiError::NotFound(NOT_FOUND_MAILBOX.to_string()))?;

    let deleted_count = delete_all_for_mailbox(&app_state.db_pool, mailbox.id).await?;
    Ok(Json(PurgeInboxResponse { deleted_count }))
}
