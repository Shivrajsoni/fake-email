use crate::services::maintenance;
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, info};

fn env_u64(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

///
pub fn spawn_periodic_data_reset(pool: Arc<PgPool>) {
    let period = Duration::from_secs(env_u64("EPHEMERAL_DB_RESET_INTERVAL_SECS", 86_400));
    if period.is_zero() {
        return;
    }
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(period).await;
            match maintenance::truncate_all_mail_data(&pool).await {
                Ok(()) => info!("data reset: all tables emptied"),
                Err(e) => error!(error = %e, "data reset failed"),
            }
        }
    });
}
