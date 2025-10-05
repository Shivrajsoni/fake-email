use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(FromRow)]
pub struct TempEmailAddress {
    pub id: Uuid,
    pub address: String,
    pub username: Option<String>,
    pub created_at: NaiveDateTime,
    pub expires_at: NaiveDateTime,
    pub is_active: Option<bool>,
}

// DTO  For API Response
#[derive(Serialize)]
pub struct TempEmailResponse {
    pub address: String,
    pub created_at: DateTime<Utc>,
    pub expiry_in_sec: u64,
}

// DTO for API Request
#[derive(Deserialize)]
pub struct TempEmailRequest {
    pub username: Option<String>,
    pub ttl_minutes: Option<u64>,
}
