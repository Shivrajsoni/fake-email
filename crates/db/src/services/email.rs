use crate::models::email::{EmailDetail, EmailSummary, NewReceivedEmail, RecievedEmail};
use crate::models::temp_address::TempEmailAddress;
use crate::services::error::ServiceError;
use crate::services::generator::generate_email_address;
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

const MAX_RETRIES: usize = 3;
const UNIQUE_VIOLATION_CODE: &str = "23505";

/// Creates a temporary email address and inserts it into the database.
/// This function orchestrates the generation of a new email address and its
/// insertion into the database. It uses an optimistic retry mechanism.
/// It will try to generate and insert an address up to `MAX_RETRIES` times.
/// If an insert fails due to a unique constraint violation (meaning the randomly
/// generated address already exists), it will loop and try again with a new address.
pub async fn create_temporary_email(
    pool: &PgPool,
    username: Option<String>,
    ttl_minutes: i64,
    domain: &str,
) -> Result<TempEmailAddress, ServiceError> {
    for _ in 0..MAX_RETRIES {
        // 1. Generate a new address IN EVERY LOOP ITERATION.
        let address = generate_email_address(username.clone(), domain);

        // 2. Get fresh timestamps for every attempt, using NaiveDateTime.
        let created_at = Utc::now();
        let expires_at = created_at + Duration::minutes(ttl_minutes);

        // 3. Attempt to insert the new record into the database.
        let record = sqlx::query_as!(
            TempEmailAddress,
            r#"
            INSERT INTO temporary_emails (id, address, username, created_at, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, address, username, created_at, expires_at, is_active
            "#,
            Uuid::new_v4(),
            address,
            username.clone(), // Pass a clone to avoid moving the original
            created_at,
            expires_at
        )
        .fetch_one(pool)
        .await;

        match record {
            Ok(new_record) => {
                // 3. Success! The insert worked, so we can return the new record.
                return Ok(new_record);
            }
            Err(e) => {
                // 4. An error occurred. We need to check if it's a unique violation.
                if is_unique_violation(&e) {
                    // It's a collision. The loop will `continue` and we'll try again.
                    continue;
                } else {
                    // It's some other database error. We should stop and return the error.
                    return Err(ServiceError::DatabaseError(e));
                }
            }
        }
    }

    // 5. If the loop finishes, we have failed after all retries.
    Err(ServiceError::FailedToFindUniqueName(MAX_RETRIES))
}

/// Checks if an sqlx::Error is a unique constraint violation for PostgreSQL.
fn is_unique_violation(e: &sqlx::Error) -> bool {
    if let sqlx::Error::Database(db_err) = e {
        // By using `db_err.code()`, we can check the error code without
        // needing to downcast to a specific database error type like `PgError`.
        if let Some(code) = db_err.code() {
            return code == UNIQUE_VIOLATION_CODE;
        }
    }
    false
}

/// Saves a new received email to the database.
pub async fn save_received_email(
    pool: &PgPool,
    email: &NewReceivedEmail<'_>,
) -> Result<RecievedEmail, sqlx::Error> {
    let record = sqlx::query_as!(
        RecievedEmail,
        r#"
        INSERT INTO received_emails (id, temp_email_id, from_address, subject, body_plain, body_html, headers, size_bytes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, temp_email_id, from_address, subject, body_plain, body_html, headers, received_at, size_bytes
        "#,
        Uuid::new_v4(),
        email.temp_email_id,
        email.from_address,
        email.subject,
        email.body_plain,
        email.body_html,
        email.headers,
        email.size_bytes
    )
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
    let records = sqlx::query_as!(
        EmailSummary,
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
        "#,
        address,
        limit,
        offset
    )
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
    let record = sqlx::query_as!(
        EmailDetail,
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
        "#,
        address,
        email_id
    )
    .fetch_optional(pool)
    .await?;

    Ok(record)
}
