use chrono::{Duration, Utc};
use serial_test::serial;
use testcontainers::core::{IntoContainerPort, WaitFor};
use testcontainers::runners::AsyncRunner;
use testcontainers::{GenericImage, ImageExt};

async fn start_postgres() -> Result<(testcontainers::ContainerAsync<GenericImage>, String), String> {
    let image = GenericImage::new("postgres", "16-alpine")
        .with_exposed_port(5432.tcp())
        .with_wait_for(WaitFor::message_on_stderr(
            "database system is ready to accept connections",
        ));

    let container = image
        .with_env_var("POSTGRES_USER", "postgres")
        .with_env_var("POSTGRES_PASSWORD", "postgres")
        .with_env_var("POSTGRES_DB", "fake_email")
        .start()
        .await
        .map_err(|e| format!("start postgres container: {e}"))?;

    let port = container
        .get_host_port_ipv4(5432.tcp())
        .await
        .map_err(|e| format!("mapped postgres port: {e}"))?;
    let url = format!("postgres://postgres:postgres@127.0.0.1:{port}/fake_email");
    Ok((container, url))
}

async fn connect_retry(url: &str) -> sqlx::postgres::PgPool {
    for _ in 0..40 {
        match sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(url)
            .await
        {
            Ok(pool) => return pool,
            Err(_) => tokio::time::sleep(std::time::Duration::from_millis(250)).await,
        }
    }
    panic!("postgres did not become ready in time");
}

#[tokio::test]
#[serial]
async fn db_connection_and_migrations_work() {
    let (_container, url) = start_postgres()
        .await
        .expect("docker/postgres must start for integration test");
    std::env::set_var("DATABASE_URL", &url);

    let pool = db::connect_pool().await.expect("connect_pool");
    db::run_migrations(&pool).await.expect("run_migrations");

    let has_temp: (bool,) = sqlx::query_as(
        "SELECT to_regclass('public.temporary_email') IS NOT NULL",
    )
    .fetch_one(&pool)
    .await
    .expect("query table temporary_email");

    let has_received: (bool,) = sqlx::query_as(
        "SELECT to_regclass('public.received_email') IS NOT NULL",
    )
    .fetch_one(&pool)
    .await
    .expect("query table received_email");

    assert!(has_temp.0);
    assert!(has_received.0);
}

#[tokio::test]
async fn insert_temp_addr_and_list_received_emails() {
    let (_container, url) = start_postgres()
        .await
        .expect("docker/postgres must start for integration test");
    let pool = connect_retry(&url).await;
    db::run_migrations(&pool).await.expect("run_migrations");

    let addr = format!("demo-{}@temp.test", Utc::now().timestamp_nanos_opt().unwrap_or_default());
    let temp = db::insert_temporary_email(&pool, &addr)
        .await
        .expect("insert temporary_email");

    let old_t = Utc::now() - Duration::hours(3);
    let cursor = Utc::now() - Duration::hours(2);

    sqlx::query(
        "INSERT INTO received_email (temporary_email_id, from_addr, subject, received_at) VALUES ($1, $2, $3, $4)",
    )
    .bind(temp.id)
    .bind("old@sender.test")
    .bind("old")
    .bind(old_t)
    .execute(&pool)
    .await
    .expect("insert old email");

    sqlx::query(
        "INSERT INTO received_email (temporary_email_id, from_addr, subject, received_at) VALUES ($1, $2, $3, now())",
    )
    .bind(temp.id)
    .bind("new@sender.test")
    .bind("new")
    .execute(&pool)
    .await
    .expect("insert new email");

    let all = db::list_received_emails(&pool, temp.id, None)
        .await
        .expect("list all emails");
    assert_eq!(all.len(), 2);

    let recent = db::list_received_emails(&pool, temp.id, Some(cursor))
        .await
        .expect("list filtered emails");
    assert_eq!(recent.len(), 1);
    assert_eq!(recent[0].subject.as_deref(), Some("new"));
}
