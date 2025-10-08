use crate::core::AppState;
use axum::{
    async_trait,
    body::Bytes,
    extract::{FromRequest, Request, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use db::models::email::NewReceivedEmail;
use axum_core::extract::FromRequest;
use http::Request;
use ring::hmac;

// --- 1. Mailgun Signature Verification ---

/// A struct to hold the components of Mailgun's signature.
pub struct MailgunSignature {
    timestamp: String,
    token: String,
    signature: String,
}

/// An Axum extractor that verifies the Mailgun signature before running the handler.
#[async_trait]
impl<S, B> FromRequest<S, B> for MailgunSignature
where
    B: Send,
    S: Send + Sync,
{
    type Rejection = WebhookError;

    async fn from_request(req: &mut axum_core::extract::RequestParts<S>) -> Result<Self, Self::Rejection> {
        let headers = req.headers();
        let timestamp = headers
            .get("X-Mailgun-Timestamp")
            .and_then(|v| v.to_str().ok())
            .ok_or(WebhookError::SignatureVerificationFailed(
                "Missing timestamp",
            ))?;
        let token = headers
            .get("X-Mailgun-Token")
            .and_then(|v| v.to_str().ok())
            .ok_or(WebhookError::SignatureVerificationFailed("Missing token"))?;
        let signature = headers
            .get("X-Mailgun-Signature")
            .and_then(|v| v.to_str().ok())
            .ok_or(WebhookError::SignatureVerificationFailed(
                "Missing signature",
            ))?;

        Ok(MailgunSignature {
            timestamp: timestamp.to_string(),
            token: token.to_string(),
            signature: signature.to_string(),
        })
    }
}

impl MailgunSignature {
    /// Verifies the signature against the webhook signing key.
    fn verify(self, signing_key: &str) -> Result<(), WebhookError> {
        let key = hmac::Key::new(hmac::HMAC_SHA256, signing_key.as_bytes());
        let mut message = self.timestamp;
        message.push_str(&self.token);

        let decoded_signature = hex::decode(self.signature)
            .map_err(|_| WebhookError::SignatureVerificationFailed("Invalid signature format"))?;

        hmac::verify(&key, message.as_bytes(), &decoded_signature)
            .map_err(|_| WebhookError::SignatureVerificationFailed("Signature mismatch"))
    }
}

// --- 2. JSON Payload Definition ---

#[derive(Debug, Deserialize)]
pub struct MailgunPayload {
    pub sender: String,
    pub recipient: String,
    pub subject: String,
    #[serde(rename = "body-plain")]
    pub body_plain: String,
    #[serde(rename = "body-html")]
    pub body_html: String,
    #[serde(rename = "Message-Id")]
    pub message_id: String,
    pub headers: Value,
}

// --- 3. Enhanced Error Handling ---

pub enum WebhookError {
    SignatureVerificationFailed(&'static str),
    TempAddressNotFound,
    DatabaseError(sqlx::Error),
}

impl IntoResponse for WebhookError {
    fn into_response(self) -> Response {
        match self {
            WebhookError::SignatureVerificationFailed(reason) => (
                StatusCode::UNAUTHORIZED,
                format!("Signature verification failed: {}", reason),
            )
                .into_response(),
            WebhookError::TempAddressNotFound => (
                StatusCode::NOT_FOUND,
                "Temporary email address not found, is inactive, or has expired.",
            )
                .into_response(),
            WebhookError::DatabaseError(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            )
                .into_response(),
        }
    }
}

// --- 4. The Final, Secure Handler ---

pub async fn mailgun_webhook_handler(
    State(state): State<AppState>,
    signature: MailgunSignature, // The signature extractor runs first.
    Json(payload): Json<MailgunPayload>,
) -> Result<StatusCode, WebhookError> {
    // Get the webhook key from secrets and verify the signature.
    let webhook_key = state.secrets.get("MAILGUN_WEBHOOK_KEY").ok_or(
        WebhookError::SignatureVerificationFailed("Missing signing key on server"),
    )?;
    signature.verify(&webhook_key)?;

    println!("✅ Verified webhook for: {}", payload.recipient);

    // Find the active and non-expired temporary email address.
    let temp_email = sqlx::query!(
        "SELECT id FROM temporary_emails WHERE address = $1 AND is_active = TRUE AND expires_at > NOW()",
        payload.recipient
    )
    .fetch_optional(&*state.db_pool)
    .await
    .map_err(WebhookError::DatabaseError)?
    .ok_or(WebhookError::TempAddressNotFound)?;

    let new_email = NewReceivedEmail {
        temp_email_id: temp_email.id,
        from_address: &payload.sender,
        subject: Some(&payload.subject),
        body_plain: Some(payload.body_plain),
        body_html: Some(payload.body_html),
        headers: payload.headers,
        size_bytes: 0,
    };

    db::services::email::save_received_email(&*state.db_pool, &new_email)
        .await
        .map_err(WebhookError::DatabaseError)?;

    println!("   -> Successfully saved email from {}", payload.sender);

    Ok(StatusCode::CREATED)
}
