use crate::models::temp_address::TempEmailAddress;
use crate::services::error::DbError;
use crate::services::generator::generate_email_address;
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

const MAX_CREATE_RETRIES: usize = 3;
const UNIQUE_VIOLATION_CODE: &str = "23505";

fn is_unique_violation(e: &sqlx::Error) -> bool {
    if let sqlx::Error::Database(db_err) = e {
        if let Some(code) = db_err.code() {
            return code == UNIQUE_VIOLATION_CODE;
        }
    }
    false
}

/// Creates a new temporary mailbox row (random or custom local part) with retry on collision.
pub async fn create(
    pool: &PgPool,
    username: Option<String>,
    ttl_minutes: i64,
    domain: &str,
) -> Result<TempEmailAddress, DbError> {
    for _ in 0..MAX_CREATE_RETRIES {
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
        .bind(&address)
        .bind(username.clone())
        .bind(created_at)
        .bind(expires_at)
        .fetch_one(pool)
        .await;

        match record {
            Ok(new_record) => return Ok(new_record),
            Err(e) => {
                if is_unique_violation(&e) {
                    continue;
                }
                return Err(DbError::from(e));
            }
        }
    }

    Err(DbError::FailedToFindUniqueAddress(MAX_CREATE_RETRIES))
}

/// Finds an active, non-expired temporary email address by its address string.
pub async fn find_by_address(
    pool: &PgPool,
    address: &str,
) -> Result<Option<TempEmailAddress>, DbError> {
    sqlx::query_as::<_, TempEmailAddress>(
        r#"
        SELECT id, address, username, created_at, expires_at, is_active
        FROM temporary_emails
        WHERE LOWER(address) = LOWER($1) AND is_active = TRUE AND expires_at > NOW()
        "#,
    )
    .bind(address)
    .fetch_optional(pool)
    .await
    .map_err(DbError::from)
}
