use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReceivedEmail {
    pub id: Uuid,
    pub temporary_email_id: Uuid,
    pub from_addr: Option<String>,
    pub to_addr: Option<String>,
    pub subject: Option<String>,
    pub body_text: Option<String>,
    pub received_at: DateTime<Utc>,
}
