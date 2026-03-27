use crate::models::email::{EmailDetail, EmailSummary, NewReceivedEmail, ReceivedEmail};
use crate::services::error::DbError;
use sqlx::{Executor, PgPool, Postgres};
use uuid::Uuid;

pub async fn insert_received<'e, E>(
    executor: E,
    email: &NewReceivedEmail<'_>,
) -> Result<ReceivedEmail, DbError>
where
    E: Executor<'e, Database = Postgres>,
{
    let record = sqlx::query_as::<_, ReceivedEmail>(
        r#"
        INSERT INTO received_emails (id, temp_email_id, from_address, subject, body_plain, body_html, headers, size_bytes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, temp_email_id, from_address, subject, body_plain, body_html, headers, received_at, size_bytes
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(email.temp_email_id)
    .bind(email.from_address)
    .bind(email.subject)
    .bind(email.body_plain.clone())
    .bind(email.body_html.clone())
    .bind(email.headers.clone())
    .bind(email.size_bytes)
    .fetch_one(executor)
    .await?;

    Ok(record)
}

pub async fn list_for_mailbox(
    pool: &PgPool,
    temp_email_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<EmailSummary>, DbError> {
    let records = sqlx::query_as::<_, EmailSummary>(
        r#"
        SELECT id,
               from_address,
               subject,
               received_at,
               LEFT(COALESCE(body_plain, body_html), 120) AS preview
        FROM received_emails
        WHERE temp_email_id = $1
        ORDER BY received_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(temp_email_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(records)
}

pub async fn get_for_mailbox(
    pool: &PgPool,
    temp_email_id: Uuid,
    email_id: Uuid,
) -> Result<Option<EmailDetail>, DbError> {
    let record = sqlx::query_as::<_, EmailDetail>(
        r#"
        SELECT id,
               from_address,
               subject,
               body_plain,
               body_html,
               received_at
        FROM received_emails
        WHERE temp_email_id = $1 AND id = $2
        "#,
    )
    .bind(temp_email_id)
    .bind(email_id)
    .fetch_optional(pool)
    .await?;
    Ok(record)
}

pub async fn delete_for_mailbox(
    pool: &PgPool,
    temp_email_id: Uuid,
    email_id: Uuid,
) -> Result<Option<EmailDetail>, DbError> {
    let record = sqlx::query_as::<_, EmailDetail>(
        r#"
        DELETE FROM received_emails
        WHERE id = $1 AND temp_email_id = $2
        RETURNING id,
                  from_address,
                  subject,
                  body_plain,
                  body_html,
                  received_at
        "#,
    )
    .bind(email_id)
    .bind(temp_email_id)
    .fetch_optional(pool)
    .await?;

    Ok(record)
}

pub async fn delete_all_for_mailbox(pool: &PgPool, temp_email_id: Uuid) -> Result<u64, DbError> {
    let result = sqlx::query("DELETE FROM received_emails WHERE temp_email_id = $1")
        .bind(temp_email_id)
        .execute(pool)
        .await?;

    Ok(result.rows_affected())
}
