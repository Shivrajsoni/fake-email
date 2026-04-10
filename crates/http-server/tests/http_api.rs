use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use http_body_util::BodyExt;
use http_server::{router, AppState};
use serde_json::{json, Value};
use serial_test::serial;
use std::sync::Arc;
use testcontainers::core::{IntoContainerPort, WaitFor};
use testcontainers::runners::AsyncRunner;
use testcontainers::{GenericImage, ImageExt};
use tokio::sync::RwLock;
use tower::util::ServiceExt;

fn test_app_state(pool: sqlx::postgres::PgPool) -> AppState {
    AppState {
        pool: Arc::new(RwLock::new(Some(pool))),
        mail_domain: Arc::from("test-mail.local"),
    }
}

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
async fn create_temporary_address_via_http() {
    let (_container, url) = start_postgres()
        .await
        .expect("docker/postgres must start for integration test");
    let pool = connect_retry(&url).await;
    db::run_migrations(&pool).await.expect("run_migrations");

    let app = router(test_app_state(pool.clone()));

    let res = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/temporary-address")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(json!({"username":"alice"}).to_string()))
                .unwrap(),
        )
        .await
        .expect("request");

    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.expect("body").to_bytes();
    let payload: Value = serde_json::from_slice(&body).expect("json");
    let addr = payload["temp_email_addr"].as_str().expect("temp_email_addr");
    assert!(addr.ends_with("@test-mail.local"));

    let persisted = db::find_temporary_email_by_addr(&pool, addr)
        .await
        .expect("query")
        .is_some();
    assert!(persisted);
}

#[tokio::test]
#[serial]
async fn poll_inbox_via_http_returns_new_messages() {
    let (_container, url) = start_postgres()
        .await
        .expect("docker/postgres must start for integration test");
    let pool = connect_retry(&url).await;
    db::run_migrations(&pool).await.expect("run_migrations");

    let addr = "poll-user@test-mail.local";
    let temp = db::insert_temporary_email(&pool, addr)
        .await
        .expect("insert temp address");

    sqlx::query(
        "INSERT INTO received_email (temporary_email_id, from_addr, to_addr, subject, body_text) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(temp.id)
    .bind("sender@remote.test")
    .bind(addr)
    .bind("hello")
    .bind("hello body")
    .execute(&pool)
    .await
    .expect("insert email");

    let app = router(test_app_state(pool));

    let uri = format!("/api/inbox/poll?address={addr}");
    let res = app
        .oneshot(
            Request::builder()
                .uri(uri)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("request");

    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.expect("body").to_bytes();
    let payload: Value = serde_json::from_slice(&body).expect("json");

    assert_eq!(payload["temp_email_addr"], addr);
    assert_eq!(payload["new_mail_count"], 1);
    let messages = payload["messages"].as_array().expect("messages[]");
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0]["subject"], "hello");
}

#[tokio::test]
#[serial]
async fn poll_inbox_incremental_empty_preserves_next_since() {
    let (_container, url) = start_postgres()
        .await
        .expect("docker/postgres must start for integration test");
    let pool = connect_retry(&url).await;
    db::run_migrations(&pool).await.expect("run_migrations");

    let addr = "cursor-user@test-mail.local";
    let temp = db::insert_temporary_email(&pool, addr)
        .await
        .expect("insert temp address");

    sqlx::query(
        "INSERT INTO received_email (temporary_email_id, from_addr, to_addr, subject, body_text) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(temp.id)
    .bind("a@b.c")
    .bind(addr)
    .bind("subj")
    .bind("body")
    .execute(&pool)
    .await
    .expect("insert email");

    let app = router(test_app_state(pool));

    let uri = format!("/api/inbox/poll?address={addr}");
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(&uri)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("request");
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.expect("body").to_bytes();
    let first: Value = serde_json::from_slice(&body).expect("json");
    let since = first["next_since"].as_str().expect("next_since");
    assert!(!since.is_empty());

    let uri_inc = format!(
        "/api/inbox/poll?address={}&since={}",
        addr,
        urlencoding::encode(since)
    );
    let res2 = app
        .oneshot(
            Request::builder()
                .uri(uri_inc)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("request2");
    assert_eq!(res2.status(), StatusCode::OK);
    let body2 = res2.into_body().collect().await.expect("body").to_bytes();
    let second: Value = serde_json::from_slice(&body2).expect("json");
    let msgs = second["messages"].as_array().expect("messages");
    assert!(msgs.is_empty());
    assert_eq!(second["next_since"].as_str(), Some(since));
}
