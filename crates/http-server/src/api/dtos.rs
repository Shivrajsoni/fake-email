use chrono::{DateTime, Utc};
use db::models::email::{EmailDetail, EmailSummary};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct GenerateMailboxRequest {
    pub username: Option<String>,
    pub ttl_minutes: Option<u64>,
}

#[derive(Serialize)]
pub struct GenerateMailboxResponse {
    pub address: String,
    pub created_at: DateTime<Utc>,
    pub expiry_in_sec: u64,
}

#[derive(Serialize)]
pub struct EmailSummaryResponse {
    pub id: Uuid,
    pub from_address: String,
    pub subject: Option<String>,
    pub received_at: DateTime<Utc>,
    pub preview: Option<String>,
}

impl From<EmailSummary> for EmailSummaryResponse {
    fn from(s: EmailSummary) -> Self {
        Self {
            id: s.id,
            from_address: s.from_address,
            subject: s.subject,
            received_at: s.received_at,
            preview: s.preview,
        }
    }
}

#[derive(Serialize)]
pub struct EmailDetailResponse {
    pub id: Uuid,
    pub from_address: String,
    pub subject: Option<String>,
    pub body_plain: Option<String>,
    pub body_html: Option<String>,
    pub received_at: DateTime<Utc>,
}

impl From<EmailDetail> for EmailDetailResponse {
    fn from(d: EmailDetail) -> Self {
        Self {
            id: d.id,
            from_address: d.from_address,
            subject: d.subject,
            body_plain: d.body_plain,
            body_html: d.body_html,
            received_at: d.received_at,
        }
    }
}

#[derive(Serialize)]
pub struct PurgeInboxResponse {
    pub deleted_count: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use db::models::email::{EmailDetail, EmailSummary};
    use chrono::Utc;

    #[test]
    fn email_summary_response_from_preserves_fields() {
        let id = Uuid::new_v4();
        let received_at = Utc::now();
        let s = EmailSummary {
            id,
            from_address: "from@example.com".to_string(),
            subject: Some("hello".to_string()),
            received_at,
            preview: Some("body preview".to_string()),
        };
        let out = EmailSummaryResponse::from(s);
        assert_eq!(out.id, id);
        assert_eq!(out.from_address, "from@example.com");
        assert_eq!(out.subject.as_deref(), Some("hello"));
        assert_eq!(out.received_at, received_at);
        assert_eq!(out.preview.as_deref(), Some("body preview"));
    }

    #[test]
    fn email_detail_response_from_preserves_fields() {
        let id = Uuid::new_v4();
        let received_at = Utc::now();
        let d = EmailDetail {
            id,
            from_address: "from@example.com".to_string(),
            subject: None,
            body_plain: Some("plain".to_string()),
            body_html: None,
            received_at,
        };
        let out = EmailDetailResponse::from(d);
        assert_eq!(out.id, id);
        assert_eq!(out.from_address, "from@example.com");
        assert_eq!(out.subject, None);
        assert_eq!(out.body_plain.as_deref(), Some("plain"));
        assert_eq!(out.body_html, None);
        assert_eq!(out.received_at, received_at);
    }
}
