use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::time::Duration;

/// Shared pool settings for all binaries. Override with `DB_MAX_CONNECTIONS`.
pub async fn connect(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let max = std::env::var("DB_MAX_CONNECTIONS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(10_u32);

    PgPoolOptions::new()
        .max_connections(max)
        .acquire_timeout(Duration::from_secs(30))
        .test_before_acquire(true)
        .connect(database_url)
        .await
}
