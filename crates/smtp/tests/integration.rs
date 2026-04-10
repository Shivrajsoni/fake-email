use serial_test::serial;
use testcontainers::core::{IntoContainerPort, WaitFor};
use testcontainers::runners::AsyncRunner;
use testcontainers::{GenericImage, ImageExt};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};

async fn start_postgres() -> (testcontainers::ContainerAsync<GenericImage>, String) {
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
        .expect("docker/postgres must start for integration test");

    let port = container
        .get_host_port_ipv4(5432.tcp())
        .await
        .expect("mapped postgres port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{port}/fake_email");
    (container, url)
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

async fn read_line(reader: &mut BufReader<tokio::net::tcp::OwnedReadHalf>) -> String {
    let mut line = String::new();
    reader.read_line(&mut line).await.expect("read line");
    line
}

async fn write_line(writer: &mut tokio::net::tcp::OwnedWriteHalf, s: &str) {
    writer
        .write_all(format!("{s}\r\n").as_bytes())
        .await
        .expect("write line");
}

#[tokio::test]
#[serial]
async fn smtp_stores_mail_for_known_recipient() {
    let (_container, url) = start_postgres().await;
    let pool = connect_retry(&url).await;
    db::run_migrations(&pool).await.expect("migrations");

    let to_addr = "alice@smtp.test";
    let temp = db::insert_temporary_email(&pool, to_addr)
        .await
        .expect("insert temp address");

    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind smtp");
    let bound = listener.local_addr().expect("local addr");
    let server_pool = pool.clone();
    let server = tokio::spawn(async move {
        smtp::run_server_on_listener(listener, server_pool)
            .await
            .expect("smtp serve");
    });

    let stream = TcpStream::connect(bound).await.expect("connect smtp");
    let (r, mut w) = stream.into_split();
    let mut reader = BufReader::new(r);

    let banner = read_line(&mut reader).await;
    assert!(banner.starts_with("220"));

    write_line(&mut w, "EHLO test").await;
    assert!(read_line(&mut reader).await.starts_with("250"));

    write_line(&mut w, "MAIL FROM:<sender@example.com>").await;
    assert!(read_line(&mut reader).await.starts_with("250"));

    write_line(&mut w, &format!("RCPT TO:<{to_addr}>" )).await;
    assert!(read_line(&mut reader).await.starts_with("250"));

    write_line(&mut w, "DATA").await;
    assert!(read_line(&mut reader).await.starts_with("354"));

    write_line(&mut w, "Subject: hello from smtp").await;
    write_line(&mut w, "").await;
    write_line(&mut w, "Body from smtp test").await;
    write_line(&mut w, ".").await;
    assert!(read_line(&mut reader).await.starts_with("250"));

    write_line(&mut w, "QUIT").await;
    assert!(read_line(&mut reader).await.starts_with("221"));

    tokio::time::sleep(std::time::Duration::from_millis(250)).await;

    let rows = db::list_received_emails(&pool, temp.id, None)
        .await
        .expect("list received");
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].to_addr.as_deref(), Some(to_addr));
    assert_eq!(rows[0].subject.as_deref(), Some("hello from smtp"));
    assert!(rows[0]
        .body_text
        .as_deref()
        .unwrap_or_default()
        .contains("Body from smtp test"));

    server.abort();
}

#[tokio::test]
#[serial]
async fn smtp_rejects_unknown_recipient() {
    let (_container, url) = start_postgres().await;
    let pool = connect_retry(&url).await;
    db::run_migrations(&pool).await.expect("migrations");

    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind smtp");
    let bound = listener.local_addr().expect("local addr");
    let server_pool = pool.clone();
    let server = tokio::spawn(async move {
        smtp::run_server_on_listener(listener, server_pool)
            .await
            .expect("smtp serve");
    });

    let stream = TcpStream::connect(bound).await.expect("connect smtp");
    let (r, mut w) = stream.into_split();
    let mut reader = BufReader::new(r);

    let _ = read_line(&mut reader).await;
    write_line(&mut w, "EHLO test").await;
    let _ = read_line(&mut reader).await;

    write_line(&mut w, "MAIL FROM:<sender@example.com>").await;
    let _ = read_line(&mut reader).await;

    write_line(&mut w, "RCPT TO:<nope@smtp.test>").await;
    let rcpt = read_line(&mut reader).await;
    assert!(rcpt.starts_with("550"));

    write_line(&mut w, "QUIT").await;
    let _ = read_line(&mut reader).await;

    let cnt: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM received_email")
        .fetch_one(&pool)
        .await
        .expect("count received_email");
    assert_eq!(cnt.0, 0);

    server.abort();
}
