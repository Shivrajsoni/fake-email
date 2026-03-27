use db::pool;
use smtp_server::{run_smtp_server, SmtpListenerConfig};
use std::sync::Arc;
use tracing::{error, info};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().json().init();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let cfg = SmtpListenerConfig::from_env();
    let db_pool = pool::connect(&db_url).await?;
    info!("database pool ready");

    info!(domain = %cfg.service_domain, "smtp listening");
    if let Err(e) = run_smtp_server(Arc::new(db_pool), cfg).await {
        error!(%e, "smtp server exited");
    }
    Ok(())
}
