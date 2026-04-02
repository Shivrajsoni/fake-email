use crate::models::temp_address::TempEmailAddress;
use crate::services::error::ServiceError;
use crate::services::generator::generate_email_address;
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

const MAX_RETRIES: usize = 3;
const UNIQUE_VIOLATION_CODE: &str = "23505";

/// Creates a temporary email address with an optimistic retry mechanism
/// for unique-constraint collisions.
pub async fn create_temporary_email(
    pool: &PgPool,
    username: Option<String>,
    ttl_minutes: i64,
    domain: &str,
) -> Result<TempEmailAddress, ServiceError> {
    for _ in 0..MAX_RETRIES {
        let address = generate_email_address(username.clone(), domain);
        let created_at = Utc::now();
        let expires_at = created_at + Duration::minutes(ttl_minutes);

        let record = sqlx::query_as::<_, TempEmailAddress>(
            r#"
            INSERT INTO temporary_emails (id, address, username, created_at, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, address, username, created_at, expires_at, is_active
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(address)
        .bind(username.clone())
        .bind(created_at)
        .bind(expires_at)
        .fetch_one(pool)
        .await;

        match record {
            Ok(new_record) => return Ok(new_record),
            Err(e) if is_unique_violation(&e) => continue,
            Err(e) => return Err(ServiceError::DatabaseError(e)),
        }
    }

    Err(ServiceError::FailedToFindUniqueName(MAX_RETRIES))
}

fn is_unique_violation(e: &sqlx::Error) -> bool {
    if let sqlx::Error::Database(db_err) = e {
        if let Some(code) = db_err.code() {
            return code == UNIQUE_VIOLATION_CODE;
        }
    }
    false
}

/// Finds an active, non-expired temporary email address by its address string.
pub async fn find_by_address(
    pool: &PgPool,
    address: &str,
) -> Result<Option<TempEmailAddress>, sqlx::Error> {
    sqlx::query_as::<_, TempEmailAddress>(
        r#"
        SELECT id, address, username, created_at, expires_at, is_active
        FROM temporary_emails
        WHERE address = $1 AND is_active = TRUE AND expires_at > NOW()
        "#,
    )
    .bind(address)
    .fetch_optional(pool)
    .await
}

/// Deactivates expired temporary email addresses.
/// Thanks to ON DELETE CASCADE on `received_emails.temp_email_id`, deleting
/// an entry from `temporary_emails` will remove associated emails.
pub async fn delete_expired_temp_addresses(pool: &PgPool) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        r#"
        DELETE FROM temporary_emails
        WHERE expires_at <= NOW()
        RETURNING id
        "#
    )
    .fetch_all(pool)
    .await?;
    Ok(result.len() as u64)
}
