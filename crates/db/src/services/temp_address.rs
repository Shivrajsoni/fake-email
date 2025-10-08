use crate::models::temp_address::TempEmailAddress;
use sqlx::PgPool;

/// Finds an active, non-expired temporary email address by its address string.
pub async fn find_by_address(
    pool: &PgPool,
    address: &str,
) -> Result<Option<TempEmailAddress>, sqlx::Error> {
    sqlx::query_as!(
        TempEmailAddress,
        r#"
        SELECT id, address, username, created_at, expires_at, is_active
        FROM temporary_emails
        WHERE address = $1 AND is_active = TRUE AND expires_at > NOW()
        "#,
        address
    )
    .fetch_optional(pool)
    .await
}

/// Deactivates expired temporary email addresses.
/// Thanks to ON DELETE CASCADE on `received_emails.temp_email_id`, deleting
/// an entry from `temporary_emails` will remove associated emails.
pub async fn delete_expired_temp_addresses(pool: &PgPool) -> Result<u64, sqlx::Error> {
    let result = sqlx::query!(
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
