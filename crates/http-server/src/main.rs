use db::{connect_pool, run_migrations};
use http_server::{router, AppState};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use tokio::sync::RwLock;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let pool_slot: Arc<RwLock<Option<PgPool>>> = Arc::new(RwLock::new(None));
    let pool_slot_bg = Arc::clone(&pool_slot);

    tokio::spawn(async move {
        let pool = match connect_pool().await {
            Ok(p) => {
                tracing::info!("database pool connected");
                p
            }
            Err(e) => {
                tracing::error!(error = %e, "database connection failed");
                return;
            }
        };
        match run_migrations(&pool).await {
            Ok(()) => {
                tracing::info!("database migrations applied");
                *pool_slot_bg.write().await = Some(pool.clone());

                let smtp_host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
                let smtp_port: u16 = std::env::var("SMTP_PORT")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(25);
                tokio::spawn(async move {
                    if let Err(e) = smtp::run_server(&smtp_host, smtp_port, pool).await {
                        tracing::error!(error = %e, "smtp server failed");
                    }
                });
            }
            Err(e) => tracing::error!(error = %e, "database migration failed"),
        }
    });

    let mail_domain: Arc<str> = std::env::var("MAIL_DOMAIN")
        .or_else(|_| std::env::var("DOMAIN"))
        .expect("MAIL_DOMAIN or DOMAIN must be set for address generation")
        .into_boxed_str()
        .into();

    let state = AppState {
        pool: pool_slot,
        mail_domain,
    };

    let app = router(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
