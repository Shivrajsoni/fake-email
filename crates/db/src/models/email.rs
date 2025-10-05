use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

pub struct RecievedEmail {
    pub id: Uuid,
    pub temp_email_id: Uuid,
    pub from_address: String,
    pub subject: Option<String>,
    pub body_plain: Option<String>,
    pub body_html: Option<String>,
    pub headers: Value,
    pub received_at: DateTime<Utc>,
    pub size_bytes: i32,
}

pub struct EmailSummary {
    pub id: Uuid,
    pub from_address: String,
    pub subject: Option<String>,
    pub received_at: DateTime<Utc>,
    pub preview: String,
}

pub struct EmailDetail {
    pub id: Uuid,
    pub from_address: String,
    pub subject: Option<String>,
    pub body_plain: Option<String>,
    pub body_html: Option<String>,
    pub received_at: DateTime<Utc>,
}
