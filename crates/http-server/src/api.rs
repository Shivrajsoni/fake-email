use crate::address::{full_address, generate_local_part};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, Utc};
use db::{
    find_temporary_email_by_addr, insert_temporary_email, list_received_emails, ReceivedEmail,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateTempAddressBody {
    pub username: Option<String>,
}

/// Only the address string — no tokens or sign-in; knowing the address is the inbox key.
#[derive(Debug, Serialize)]
pub struct CreateTempAddressResponse {
    pub temp_email_addr: String,
}

#[derive(Debug, Deserialize)]
pub struct InboxByAddressQuery {
    pub address: String,
    pub since: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MailMessage {
    pub id: Uuid,
    pub from_addr: Option<String>,
    pub to_addr: Option<String>,
    pub subject: Option<String>,
    pub body_text: Option<String>,
    pub received_at: DateTime<Utc>,
}

/// Structured poll result for one temp address (`since` = RFC3339, only rows with `received_at` > `since`).
#[derive(Debug, Serialize)]
pub struct PollInboxResponse {
    pub temp_email_addr: String,
    pub has_new: bool,
    pub new_mail_count: usize,
    /// Use as `since` on the next poll to fetch only newer mail (largest `received_at` in this batch).
    pub next_since: Option<DateTime<Utc>>,
    pub messages: Vec<MailMessage>,
}

fn pool_unavailable() -> Response {
    (StatusCode::SERVICE_UNAVAILABLE, "database not ready").into_response()
}

fn is_unique_violation(e: &sqlx::Error) -> bool {
    match e {
        sqlx::Error::Database(dbe) => dbe.code().map_or(false, |c| c == "23505"),
        _ => false,
    }
}

pub async fn create_temporary_address(
    State(state): State<AppState>,
    Json(body): Json<CreateTempAddressBody>,
) -> Result<Json<CreateTempAddressResponse>, Response> {
    let pool = {
        let g = state.pool.read().await;
        g.clone().ok_or_else(pool_unavailable)?
    };

    let domain = state.mail_domain.as_ref();
    const MAX_ATTEMPTS: u32 = 3;

    for _ in 0..MAX_ATTEMPTS {
        let local = generate_local_part(body.username.as_deref());
        let addr = full_address(&local, domain);

        match insert_temporary_email(&pool, &addr).await {
            Ok(row) => {
                return Ok(Json(CreateTempAddressResponse {
                    temp_email_addr: row.temp_email_addr,
                }));
            }
            Err(e) if is_unique_violation(&e) => continue,
            Err(e) => {
                tracing::error!(error = %e, "insert temporary_email failed");
                return Err((StatusCode::INTERNAL_SERVER_ERROR, "database error").into_response());
            }
        }
    }

    Err((
        StatusCode::CONFLICT,
        "could not allocate a unique address; try again",
    )
        .into_response())
}

pub async fn poll_inbox_by_address(
    State(state): State<AppState>,
    Query(q): Query<InboxByAddressQuery>,
) -> Result<Json<PollInboxResponse>, Response> {
    let pool = {
        let g = state.pool.read().await;
        g.clone().ok_or_else(pool_unavailable)?
    };

    let addr = q.address.trim();
    if addr.is_empty() || !addr.contains('@') {
        return Err((StatusCode::BAD_REQUEST, "invalid or missing address").into_response());
    }

    let temp = find_temporary_email_by_addr(&pool, addr)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "find temporary_email by addr failed");
            (StatusCode::INTERNAL_SERVER_ERROR, "database error").into_response()
        })?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "unknown temporary address").into_response())?;

    let since = parse_since_optional(q.since.as_deref()).map_err(bad_request)?;

    let rows = list_received_emails(&pool, temp.id, since)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "list received_email failed");
            (StatusCode::INTERNAL_SERVER_ERROR, "database error").into_response()
        })?;

    let messages: Vec<MailMessage> = rows.iter().map(to_mail_message).collect();
    let new_mail_count = messages.len();
    let has_new = new_mail_count > 0;
    let next_since = messages.iter().map(|m| m.received_at).max();

    Ok(Json(PollInboxResponse {
        temp_email_addr: temp.temp_email_addr,
        has_new,
        new_mail_count,
        next_since,
        messages,
    }))
}

fn to_mail_message(r: &ReceivedEmail) -> MailMessage {
    MailMessage {
        id: r.id,
        from_addr: r.from_addr.clone(),
        to_addr: r.to_addr.clone(),
        subject: r.subject.clone(),
        body_text: r.body_text.clone(),
        received_at: r.received_at,
    }
}

fn parse_since_optional(s: Option<&str>) -> Result<Option<DateTime<Utc>>, String> {
    let Some(raw) = s.filter(|x| !x.is_empty()) else {
        return Ok(None);
    };
    DateTime::parse_from_rfc3339(raw)
        .map(|dt| Some(dt.with_timezone(&Utc)))
        .map_err(|_| format!("since must be RFC3339, got {raw:?}"))
}

fn bad_request(msg: String) -> Response {
    (StatusCode::BAD_REQUEST, msg).into_response()
}
