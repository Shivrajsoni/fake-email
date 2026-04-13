use db::{connect_pool, purge_all_data, run_migrations};
use http_server::{router, AppState};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use tokio::sync::RwLock;

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.into())
}

fn env_parse<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let mail_domain: Arc<str> = std::env::var("MAIL_DOMAIN")
        .or_else(|_| std::env::var("DOMAIN"))
        .expect("MAIL_DOMAIN or DOMAIN must be set")
        .into();

    tracing::info!(domain = %mail_domain, "starting fake-email backend");

    let pool_slot: Arc<RwLock<Option<PgPool>>> = Arc::new(RwLock::new(None));

    tokio::spawn({
        let pool_slot = Arc::clone(&pool_slot);
        async move {
            let pool = match connect_pool().await {
                Ok(p) => {
                    tracing::info!("database connected");
                    p
                }
                Err(e) => {
                    tracing::error!(error = %e, "database connection failed");
                    return;
                }
            };

            if let Err(e) = run_migrations(&pool).await {
                tracing::error!(error = %e, "migrations failed");
                return;
            }
            tracing::info!("migrations applied");

            *pool_slot.write().await = Some(pool.clone());

            let purge_hour: u32 = env_parse("PURGE_HOUR_UTC", 3);
            tokio::spawn(daily_purge_loop(pool.clone(), purge_hour));

            let smtp_host = env_or("SMTP_HOST", "0.0.0.0");
            let smtp_port: u16 = env_parse("SMTP_PORT", 25);
            if let Err(e) = smtp::run_server(&smtp_host, smtp_port, pool).await {
                tracing::error!(error = %e, "smtp server failed");
            }
        }
    });

    let state = AppState {
        pool: pool_slot,
        mail_domain,
    };

    let http_host = env_or("HTTP_HOST", "127.0.0.0");
    let http_port: u16 = env_parse("HTTP_PORT", 3001);
    let bind_addr = format!("{http_host}:{http_port}");

    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .unwrap_or_else(|e| panic!("failed to bind {bind_addr}: {e}"));

    tracing::info!(%bind_addr, "http listening");

    axum::serve(listener, router(state))
        .await
        .unwrap_or_else(|e| tracing::error!(error = %e, "http server exited with error"));
}

async fn daily_purge_loop(pool: PgPool, hour_utc: u32) {
    use chrono::Utc;

    loop {
        let now = Utc::now();
        let today_purge = now
            .date_naive()
            .and_hms_opt(hour_utc, 0, 0)
            .expect("valid purge hour");
        let next = if now.naive_utc() >= today_purge {
            today_purge + chrono::Duration::days(1)
        } else {
            today_purge
        };

        let wait = (next - now.naive_utc())
            .to_std()
            .unwrap_or(std::time::Duration::from_secs(3600));

        tracing::info!(
            next_purge = %next,
            wait_secs = wait.as_secs(),
            "daily purge scheduled"
        );

        tokio::time::sleep(wait).await;

        match purge_all_data(&pool).await {
            Ok(r) => tracing::info!(
                emails = r.emails_deleted,
                inboxes = r.inboxes_deleted,
                "daily purge complete"
            ),
            Err(e) => tracing::error!(error = %e, "daily purge failed"),
        }
    }
}
