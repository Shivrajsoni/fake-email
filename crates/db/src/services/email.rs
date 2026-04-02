use crate::models::email::{EmailDetail, EmailSummary, NewReceivedEmail, ReceivedEmail};
use sqlx::PgPool;
use uuid::Uuid;

/// Saves a new received email to the database.
pub async fn save_received_email(
    pool: &PgPool,
    email: &NewReceivedEmail<'_>,
) -> Result<ReceivedEmail, sqlx::Error> {
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
    .bind(&email.body_plain)
    .bind(&email.body_html)
    .bind(&email.headers)
    .bind(email.size_bytes)
    .fetch_one(pool)
    .await?;

    Ok(record)
}

/// Lists email summaries for a given temporary email address.
pub async fn list_email_summaries_by_address(
    pool: &PgPool,
    address: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<EmailSummary>, sqlx::Error> {
    let records = sqlx::query_as::<_, EmailSummary>(
        r#"
        SELECT e.id,
               e.from_address,
               e.subject,
               e.received_at,
               LEFT(COALESCE(e.body_plain, e.body_html), 120) AS preview
        FROM received_emails e
        JOIN temporary_emails t ON e.temp_email_id = t.id
        WHERE t.address = $1
        ORDER BY e.received_at DESC
        LIMIT $2 OFFSET $3
        "#
    )
    .bind(address)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(records)
}

/// Fetches full email detail by id, ensuring it belongs to the given temp address.
pub async fn get_email_detail_by_address(
    pool: &PgPool,
    address: &str,
    email_id: Uuid,
) -> Result<Option<EmailDetail>, sqlx::Error> {
    let record = sqlx::query_as::<_, EmailDetail>(
        r#"
        SELECT e.id,
               e.from_address,
               e.subject,
               e.body_plain,
               e.body_html,
               e.received_at
        FROM received_emails e
        JOIN temporary_emails t ON e.temp_email_id = t.id
        WHERE t.address = $1 AND e.id = $2
        "#
    )
    .bind(address)
    .bind(email_id)
    .fetch_optional(pool)
    .await?;
    Ok(record)
}

/// Deletes an email by ID, ensuring it belongs to the given temporary address.
/// Returns the deleted email details, or None if the email was not found.
pub async fn delete_email_by_id(
    pool: &PgPool,
    address: &str,
    email_id: Uuid,
) -> Result<Option<EmailDetail>, sqlx::Error> {
    let record = sqlx::query_as::<_, EmailDetail>(
        r#"
        SELECT e.id,
               e.from_address,
               e.subject,
               e.body_plain,
               e.body_html,
               e.received_at
        FROM received_emails e
        JOIN temporary_emails t ON e.temp_email_id = t.id
        WHERE t.address = $1 AND e.id = $2
        "#
    )
    .bind(address)
    .bind(email_id)
    .fetch_optional(pool)
    .await?;

    if record.is_none() {
        return Ok(None);
    }

    let deleted_count = sqlx::query("DELETE FROM received_emails WHERE id = $1")
        .bind(email_id)
        .execute(pool)
        .await?
        .rows_affected();

    if deleted_count > 0 {
        Ok(record)
    } else {
        Ok(None)
    }
}

/// Deletes all emails associated with a given temporary email address.
pub async fn delete_all_emails_by_address(
    pool: &PgPool,
    address: &str,
) -> Result<u64, sqlx::Error> {
    let temp_email_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM temporary_emails WHERE address = $1",
    )
    .bind(address)
    .fetch_optional(pool)
    .await?;

    match temp_email_id {
        Some(id) => {
            let deleted = sqlx::query("DELETE FROM received_emails WHERE temp_email_id = $1")
                .bind(id)
                .execute(pool)
                .await?
                .rows_affected();
            Ok(deleted)
        }
        None => Ok(0),
    }
}
