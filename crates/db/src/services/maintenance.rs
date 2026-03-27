//! Full-table resets (schema unchanged).

use crate::services::error::DbError;
use sqlx::PgPool;

/// Removes every row from `temporary_emails` and `received_emails` (FK CASCADE).
pub async fn truncate_all_mail_data(pool: &PgPool) -> Result<(), DbError> {
    sqlx::query("TRUNCATE TABLE temporary_emails CASCADE")
        .execute(pool)
        .await
        .map_err(DbError::from)?;
    Ok(())
}
