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
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateTempAddressBody {
    pub username: Option<String>,
}

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
pub struct PollInboxResponse {
    pub temp_email_addr: String,
    pub new_mail_count: usize,
    pub next_since: Option<DateTime<Utc>>,
    pub messages: Vec<ReceivedEmail>,
}

fn pool_unavailable() -> Response {
    (StatusCode::SERVICE_UNAVAILABLE, "database not ready").into_response()
}

fn db_error(e: sqlx::Error) -> Response {
    tracing::error!(error = %e, "database");
    (StatusCode::INTERNAL_SERVER_ERROR, "database error").into_response()
}

async fn get_pool(state: &AppState) -> Result<PgPool, Response> {
    state.pool.read().await.clone().ok_or_else(pool_unavailable)
}

fn is_unique_violation(e: &sqlx::Error) -> bool {
    match e {
        sqlx::Error::Database(dbe) => dbe.code().is_some_and(|c| c == "23505"),
        _ => false,
    }
}

pub async fn create_temporary_address(
    State(state): State<AppState>,
    Json(body): Json<CreateTempAddressBody>,
) -> Result<Json<CreateTempAddressResponse>, Response> {
    let pool = get_pool(&state).await?;
    let domain = state.mail_domain.as_ref();

    for _ in 0..3u8 {
        let addr = full_address(&generate_local_part(body.username.as_deref()), domain);
        match insert_temporary_email(&pool, &addr).await {
            Ok(row) => {
                return Ok(Json(CreateTempAddressResponse {
                    temp_email_addr: row.temp_email_addr,
                }));
            }
            Err(e) if is_unique_violation(&e) => continue,
            Err(e) => return Err(db_error(e)),
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
    let pool = get_pool(&state).await?;

    let addr = q.address.trim();
    if addr.is_empty() || !addr.contains('@') {
        return Err((StatusCode::BAD_REQUEST, "invalid or missing address").into_response());
    }

    let temp = find_temporary_email_by_addr(&pool, addr)
        .await
        .map_err(db_error)?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "unknown temporary address").into_response())?;

    let since = parse_since(q.since.as_deref()).map_err(|msg| {
        (StatusCode::BAD_REQUEST, msg).into_response()
    })?;

    let messages = list_received_emails(&pool, temp.id, since)
        .await
        .map_err(db_error)?;

    let new_mail_count = messages.len();
    let next_since = match messages.iter().map(|m| m.received_at).max() {
        Some(max_ts) => Some(max_ts),
        None => since,
    };

    Ok(Json(PollInboxResponse {
        temp_email_addr: temp.temp_email_addr,
        new_mail_count,
        next_since,
        messages,
    }))
}

fn parse_since(s: Option<&str>) -> Result<Option<DateTime<Utc>>, String> {
    let Some(raw) = s.map(str::trim).filter(|x| !x.is_empty()) else {
        return Ok(None);
    };
    DateTime::parse_from_rfc3339(raw)
        .map(|dt| Some(dt.with_timezone(&Utc)))
        .map_err(|_| format!("since must be RFC3339, got {raw:?}"))
}

fn generate_local_part(username: Option<&str>) -> String {
    let mut rng = rand::thread_rng();
    let prefix: String = username
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| {
            s.chars()
                .filter(|c| c.is_ascii_alphanumeric())
                .take(5)
                .collect::<String>()
                .to_lowercase()
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            (&mut rng)
                .sample_iter(&Alphanumeric)
                .take(5)
                .map(char::from)
                .collect::<String>()
                .to_lowercase()
        });

    let suffix: String = (&mut rng)
        .sample_iter(&Alphanumeric)
        .take(3)
        .map(char::from)
        .collect::<String>()
        .to_lowercase();

    format!("{prefix}{suffix}")
}

fn full_address(local_part: &str, domain: &str) -> String {
    format!("{local_part}@{domain}")
}
