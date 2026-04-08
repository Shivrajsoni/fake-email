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

pub async fn find_temporary_email_by_id(
    pool: &PgPool,
    id: Uuid,
) -> Result<Option<TemporaryEmail>, sqlx::Error> {
    sqlx::query_as::<_, TemporaryEmail>(
        r#"
        SELECT id, temp_email_addr, created_at
        FROM temporary_email
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

/// Returns received emails for this temp inbox, optionally only those newer than `since`.
pub async fn list_received_emails(
    pool: &PgPool,
    temporary_email_id: Uuid,
    since: Option<DateTime<Utc>>,
) -> Result<Vec<ReceivedEmail>, sqlx::Error> {
    match since {
        Some(t) => {
            sqlx::query_as::<_, ReceivedEmail>(
                r#"
                SELECT id, temporary_email_id, from_addr, to_addr, subject, body_text, received_at
                FROM received_email
                WHERE temporary_email_id = $1 AND received_at > $2
                ORDER BY received_at ASC
                "#,
            )
            .bind(temporary_email_id)
            .bind(t)
            .fetch_all(pool)
            .await
        }
        None => {
            sqlx::query_as::<_, ReceivedEmail>(
                r#"
                SELECT id, temporary_email_id, from_addr, to_addr, subject, body_text, received_at
                FROM received_email
                WHERE temporary_email_id = $1
                ORDER BY received_at ASC
                "#,
            )
            .bind(temporary_email_id)
            .fetch_all(pool)
            .await
        }
    }
}
