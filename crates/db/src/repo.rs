use crate::models::{ReceivedEmail, TemporaryEmail};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn insert_temporary_email(
    pool: &PgPool,
    temp_email_addr: &str,
) -> Result<TemporaryEmail, sqlx::Error> {
    sqlx::query_as::<_, TemporaryEmail>(
        "INSERT INTO temporary_email (temp_email_addr) VALUES ($1) RETURNING id, temp_email_addr, created_at",
    )
    .bind(temp_email_addr)
    .fetch_one(pool)
    .await
}

pub async fn find_temporary_email_by_addr(
    pool: &PgPool,
    temp_email_addr: &str,
) -> Result<Option<TemporaryEmail>, sqlx::Error> {
    sqlx::query_as::<_, TemporaryEmail>(
        "SELECT id, temp_email_addr, created_at FROM temporary_email WHERE temp_email_addr = $1",
    )
    .bind(temp_email_addr)
    .fetch_optional(pool)
    .await
}

pub async fn list_received_emails(
    pool: &PgPool,
    temporary_email_id: Uuid,
    since: Option<DateTime<Utc>>,
) -> Result<Vec<ReceivedEmail>, sqlx::Error> {
    sqlx::query_as::<_, ReceivedEmail>(
        "SELECT id, temporary_email_id, from_addr, to_addr, subject, body_text, received_at \
         FROM received_email \
         WHERE temporary_email_id = $1 AND ($2::timestamptz IS NULL OR received_at > $2) \
         ORDER BY received_at ASC",
    )
    .bind(temporary_email_id)
    .bind(since)
    .fetch_all(pool)
    .await
}

pub async fn insert_received_email(
    pool: &PgPool,
    temporary_email_id: Uuid,
    from_addr: Option<&str>,
    to_addr: Option<&str>,
    subject: Option<&str>,
    body_text: Option<&str>,
) -> Result<ReceivedEmail, sqlx::Error> {
    sqlx::query_as::<_, ReceivedEmail>(
        "INSERT INTO received_email (temporary_email_id, from_addr, to_addr, subject, body_text) \
         VALUES ($1, $2, $3, $4, $5) \
         RETURNING id, temporary_email_id, from_addr, to_addr, subject, body_text, received_at",
    )
    .bind(temporary_email_id)
    .bind(from_addr)
    .bind(to_addr)
    .bind(subject)
    .bind(body_text)
    .fetch_one(pool)
    .await
}

pub async fn purge_all_data(pool: &PgPool) -> Result<PurgeResult, sqlx::Error> {
    let emails = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM received_email")
        .fetch_one(pool)
        .await?;
    let inboxes = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM temporary_email")
        .fetch_one(pool)
        .await?;

    sqlx::query("TRUNCATE received_email, temporary_email")
        .execute(pool)
        .await?;

    Ok(PurgeResult {
        emails_deleted: emails,
        inboxes_deleted: inboxes,
    })
}

pub struct PurgeResult {
    pub emails_deleted: i64,
    pub inboxes_deleted: i64,
}
