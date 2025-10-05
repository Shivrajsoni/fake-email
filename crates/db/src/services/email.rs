use crate::models::temp_address::TempEmailAddress;
use crate::models::email::{EmailSummary, EmailDetail, RecievedEmail};
use crate::services::error::ServiceError;
use crate::services::generator::generate_email_address;
use chrono::{Duration, Utc};
use serde_json::Value;
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
        let created_at = Utc::now().naive_utc();
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

