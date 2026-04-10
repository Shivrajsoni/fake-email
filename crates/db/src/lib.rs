mod models;
mod repo;

pub use models::{ReceivedEmail, TemporaryEmail};
pub use repo::{
    find_temporary_email_by_addr, insert_received_email, insert_temporary_email,
    list_received_emails,
};

use sqlx::postgres::{PgPool, PgPoolOptions};
use std::env;

pub async fn connect_pool() -> Result<PgPool, sqlx::Error> {
    dotenvy::dotenv().ok();
    let database_url = env::var("DATABASE_URL").map_err(|_| {
        sqlx::Error::Configuration("DATABASE_URL environment variable is not set".into())
    })?;
    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
}

pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}
