use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemporaryEmail {
    pub id: Uuid,
    pub temp_email_addr: String,
    pub created_at: DateTime<Utc>,
}
