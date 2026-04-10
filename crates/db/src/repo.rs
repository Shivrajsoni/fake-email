use crate::models::{ReceivedEmail, TemporaryEmail};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn insert_temporary_email(
    pool: &PgPool,
    temp_email_addr: &str,
) -> Result<TemporaryEmail, sqlx::Error> {
    sqlx::query_as::<_, TemporaryEmail>(
        r#"
        INSERT INTO temporary_email (temp_email_addr)
        VALUES ($1)
        RETURNING id, temp_email_addr, created_at
        "#,
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
        r#"
        SELECT id, temp_email_addr, created_at
        FROM temporary_email
        WHERE temp_email_addr = $1
        "#,
    )
    .bind(temp_email_addr)
    .fetch_optional(pool)
    .await
}

/// Lists messages for an inbox. With `since`, only rows with `received_at` strictly after it.
pub async fn list_received_emails(
    pool: &PgPool,
    temporary_email_id: Uuid,
    since: Option<DateTime<Utc>>,
) -> Result<Vec<ReceivedEmail>, sqlx::Error> {
    sqlx::query_as::<_, ReceivedEmail>(
        r#"
        SELECT id, temporary_email_id, from_addr, to_addr, subject, body_text, received_at
        FROM received_email
        WHERE temporary_email_id = $1
          AND ($2::timestamptz IS NULL OR received_at > $2)
        ORDER BY received_at ASC
        "#,
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
        r#"
        INSERT INTO received_email (temporary_email_id, from_addr, to_addr, subject, body_text)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, temporary_email_id, from_addr, to_addr, subject, body_text, received_at
        "#,
    )
    .bind(temporary_email_id)
    .bind(from_addr)
    .bind(to_addr)
    .bind(subject)
    .bind(body_text)
    .fetch_one(pool)
    .await
}
