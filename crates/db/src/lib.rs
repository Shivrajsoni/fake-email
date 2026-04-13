mod models;
mod repo;

pub use models::{ReceivedEmail, TemporaryEmail};
pub use repo::{
    find_temporary_email_by_addr, insert_received_email, insert_temporary_email,
    list_received_emails, purge_all_data, PurgeResult,
};

use sqlx::postgres::{PgPool, PgPoolOptions};

pub async fn connect_pool() -> Result<PgPool, sqlx::Error> {
    let database_url = std::env::var("DATABASE_URL").map_err(|_| {
        sqlx::Error::Configuration("DATABASE_URL is not set".into())
    })?;
    PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
}

pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}
