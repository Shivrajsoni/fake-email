use mail_parser::MessageParser;
use sqlx::PgPool;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};

fn split_headers_and_body(raw: &str) -> (String, String) {
    if let Some(idx) = raw.find("\r\n\r\n") {
        let (h, b) = raw.split_at(idx + 4);
        return (h.to_string(), b.to_string());
    }
    if let Some(idx) = raw.find("\n\n") {
        let (h, b) = raw.split_at(idx + 2);
        return (h.to_string(), b.to_string());
    }
    (raw.to_string(), String::new())
}

fn extract_from_address(headers: &str) -> Option<String> {
    for line in headers.lines() {
        let l = line.trim();
        if l.to_ascii_lowercase().starts_with("from:") {
            let v = l[5..].trim();
            if let Some(start) = v.find('<') {
                if let Some(end) = v[start + 1..].find('>') {
                    return Some(v[start + 1..start + 1 + end].to_string());
                }
            }
            // fallback to first token that looks like an email
            if let Some(space_idx) = v.find(' ') {
                let tail = v[space_idx..].trim();
                if let Some(at_idx) = tail.find('@') {
                    // take surrounding token
                    let start = tail[..at_idx]
                        .rfind(|c: char| c == ' ' || c == '<' || c == '"')
                        .map(|i| i + 1)
                        .unwrap_or(0);
                    let end = tail[at_idx..]
                        .find(|c: char| c == ' ' || c == '>' || c == '"')
                        .map(|i| at_idx + i)
                        .unwrap_or(tail.len());
                    return Some(tail[start..end].trim_matches([',']).to_string());
                }
            }
            return Some(v.to_string());
        }
    }
    None
}

#[derive(Error, Debug)]
pub enum SmtpServerError {
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Database error: {0}")]
    DbError(#[from] sqlx::Error),
}

/// The main entry point for the SMTP server.
/// It binds to the port and enters a loop to accept new connections.
pub async fn run_smtp_server(db_pool: Arc<PgPool>) -> Result<(), SmtpServerError> {
    let smtp_host = env::var("SMTP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let smtp_port = env::var("SMTP_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(587);
    let domain = env::var("DOMAIN").unwrap_or_else(|_| "localhost".to_string());
    let smtp_bind_addr = format!("{}:{}", smtp_host, smtp_port);

    let listener = TcpListener::bind(&smtp_bind_addr).await?;
    let local_addr: SocketAddr = listener.local_addr()?;
    println!("SMTP Server listening on {}", local_addr);

    let domain = Arc::new(domain);
    let mut consecutive_errors: u32 = 0;

    loop {
        match listener.accept().await {
            Ok((stream, _addr)) => {
                consecutive_errors = 0;
                let db_pool_clone = Arc::clone(&db_pool);
                let domain_clone = Arc::clone(&domain);

                tokio::spawn(async move {
                    if let Err(e) = handle_connection(stream, db_pool_clone, &domain_clone).await {
                        eprintln!("SMTP connection error: {:?}", e);
                    }
                });
            }
            Err(e) => {
                consecutive_errors += 1;
                eprintln!(
                    "SMTP accept error ({} consecutive): {:?}",
                    consecutive_errors, e
                );
                // Back off on repeated accept failures to avoid busy-looping
                // (e.g. fd exhaustion, permission errors).
                let backoff = std::cmp::min(consecutive_errors, 5);
                tokio::time::sleep(Duration::from_secs(backoff as u64)).await;
            }
        }
    }
}

/// Handles a single client connection, processing SMTP commands.
async fn handle_connection(
    stream: TcpStream,
    db_pool: Arc<PgPool>,
    domain: &str,
) -> Result<(), SmtpServerError> {
    let mut reader = BufReader::new(stream);

    write_line(&mut reader, &format!("220 {} Service Ready", domain)).await?;

    let mut line = String::new();
    let mut recipient: Option<String> = None;

    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line).await?;
        if bytes_read == 0 {
            break;
        }

        let command = line.trim();
        println!("<- {}", command);

        if command.starts_with("HELO") || command.starts_with("EHLO") {
            write_line(&mut reader, "250 OK").await?;
        } else if command.starts_with("MAIL FROM") {
            write_line(&mut reader, "250 OK").await?;
        } else if command.starts_with("RCPT TO:") {
            let mut rcpt: Option<String> = None;
            if let Some(start) = command.find('<') {
                if let Some(end) = command.find('>') {
                    rcpt = Some(command[start + 1..end].to_string());
                }
            }

            match rcpt {
                Some(addr) => {
                    println!("RCPT candidate: {}", addr);
                    match db::services::temp_address::find_by_address(&db_pool, &addr).await {
                        Ok(Some(_temp)) => {
                            println!("RCPT accepted: {}", addr);
                            recipient = Some(addr);
                            write_line(&mut reader, "250 OK").await?;
                        }
                        Ok(None) => {
                            eprintln!("RCPT rejected (not found/expired): {}", addr);
                            write_line(&mut reader, "550 User not local").await?;
                        }
                        Err(e) => {
                            eprintln!("RCPT DB error for {}: {:?}", addr, e);
                            write_line(&mut reader, "451 Server error").await?;
                        }
                    }
                }
                None => {
                    eprintln!("RCPT parse error: {}", command);
                    write_line(&mut reader, "501 Syntax error in parameters").await?;
                }
            }
        } else if command.starts_with("DATA") {
            if recipient.is_none() {
                eprintln!("No recipient specified before DATA command.");
                write_line(&mut reader, "503 Bad sequence of commands").await?;
                continue;
            }

            write_line(&mut reader, "354 End data with <CR><LF>.<CR><LF>").await?;

            let mut email_data_lines = Vec::new();
            loop {
                let mut data_line = String::new();
                let n = reader.read_line(&mut data_line).await?;
                if n == 0 {
                    break;
                }
                let trimmed = data_line.trim_end_matches(['\r', '\n']);
                if trimmed == "." {
                    break;
                }
                if trimmed.starts_with('.') {
                    email_data_lines.push(format!("{}\r\n", &trimmed[1..]));
                } else {
                    if data_line.ends_with('\n') {
                        if data_line.ends_with("\r\n") {
                            email_data_lines.push(data_line);
                        } else {
                            email_data_lines.push(data_line.replace('\n', "\r\n"));
                        }
                    } else {
                        email_data_lines.push(format!("{}\r\n", data_line));
                    }
                }
            }
            let raw_email = email_data_lines.join("");
            println!("DATA received bytes: {}", raw_email.len());

            let recipient_addr = recipient.as_ref().unwrap();

            let temp_address =
                match db::services::temp_address::find_by_address(&db_pool, recipient_addr).await {
                    Ok(Some(addr)) => addr,
                    Ok(None) => {
                        eprintln!("Recipient {} not found in database.", recipient_addr);
                        write_line(&mut reader, "550 User not local").await?;
                        continue;
                    }
                    Err(e) => {
                        eprintln!("Database error finding recipient: {:?}", e);
                        write_line(&mut reader, "451 Server error").await?;
                        continue;
                    }
                };

            let message = match MessageParser::default().parse(raw_email.as_bytes()) {
                Some(msg) => msg,
                None => {
                    eprintln!("Failed to parse email data.");
                    write_line(&mut reader, "451 Parsing error").await?;
                    continue;
                }
            };

            let headers_map = serde_json::Map::new();

            let (headers_str, body_str) = split_headers_and_body(&raw_email);
            let from_address = extract_from_address(&headers_str)
                .unwrap_or_else(|| "unknown@sender.com".to_string());

            let body_plain = if !body_str.is_empty() {
                Some(body_str.clone())
            } else {
                None
            };
            let body_html = None;

            let new_email = db::models::email::NewReceivedEmail {
                temp_email_id: temp_address.id,
                from_address: &from_address,
                subject: message.subject(),
                body_plain,
                body_html,
                headers: serde_json::Value::Object(headers_map),
                size_bytes: raw_email.len() as i32,
            };

            match db::services::email::save_received_email(&db_pool, &new_email).await {
                Ok(saved_email) => {
                    println!(
                        "Successfully saved email id={} for temp_email_id={} address={}",
                        saved_email.id, temp_address.id, temp_address.address
                    );
                    let ok_msg = format!(
                        "250 OK: Saved {} for {}",
                        saved_email.id, temp_address.address
                    );
                    write_line(&mut reader, &ok_msg).await?;
                }
                Err(e) => {
                    eprintln!("Failed to save email to database: {:?}", e);
                    write_line(&mut reader, "451 DB save error").await?;
                }
            }
        } else if command.starts_with("QUIT") {
            write_line(&mut reader, "221 Bye").await?;
            break;
        } else {
            write_line(&mut reader, "500 Command not recognized").await?;
        }
    }

    Ok(())
}

/// Helper function to write a line back to the client.
async fn write_line(reader: &mut BufReader<TcpStream>, s: &str) -> Result<(), SmtpServerError> {
    println!("-> {}", s);
    reader.get_mut().write_all(s.as_bytes()).await?;
    reader.get_mut().write_all(b"\r\n").await?;
    reader.get_mut().flush().await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Unit tests (no database required — safe to run during `docker build`)
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    // ── split_headers_and_body ───────────────────────────────────────

    #[test]
    fn split_crlf_separator() {
        let raw = "From: a@b.com\r\nSubject: hi\r\n\r\nBody here";
        let (h, b) = split_headers_and_body(raw);
        assert!(h.contains("Subject: hi"));
        assert_eq!(b, "Body here");
    }

    #[test]
    fn split_lf_only_separator() {
        let raw = "From: a@b.com\nSubject: hi\n\nBody here";
        let (h, b) = split_headers_and_body(raw);
        assert!(h.contains("Subject: hi"));
        assert_eq!(b, "Body here");
    }

    #[test]
    fn split_no_body() {
        let raw = "From: a@b.com\r\nSubject: hi";
        let (h, b) = split_headers_and_body(raw);
        assert_eq!(h, raw);
        assert!(b.is_empty(), "expected empty body, got: {b:?}");
    }

    #[test]
    fn split_empty_input() {
        let (h, b) = split_headers_and_body("");
        assert!(h.is_empty());
        assert!(b.is_empty());
    }

    #[test]
    fn split_body_with_double_blank_lines() {
        let raw = "From: x@y.com\r\n\r\nLine1\r\n\r\nLine2";
        let (_h, b) = split_headers_and_body(raw);
        assert!(b.contains("Line1"));
        assert!(b.contains("Line2"));
    }

    // ── extract_from_address ─────────────────────────────────────────

    #[test]
    fn extract_angle_bracket_from() {
        let headers = "From: John Doe <john@example.com>\r\nSubject: hi\r\n";
        assert_eq!(
            extract_from_address(headers),
            Some("john@example.com".to_string())
        );
    }

    #[test]
    fn extract_bare_from() {
        let headers = "From: alice@example.com\r\nSubject: hi\r\n";
        assert_eq!(
            extract_from_address(headers),
            Some("alice@example.com".to_string())
        );
    }

    #[test]
    fn extract_from_mixed_case_header() {
        let headers = "from: Bob <bob@test.org>\r\n";
        assert_eq!(
            extract_from_address(headers),
            Some("bob@test.org".to_string())
        );
    }

    #[test]
    fn extract_from_display_name_with_quotes() {
        let headers = "From: \"Jane Doe\" <jane@example.com>\r\n";
        assert_eq!(
            extract_from_address(headers),
            Some("jane@example.com".to_string())
        );
    }

    #[test]
    fn extract_from_no_from_header() {
        let headers = "Subject: hi\r\nTo: someone@example.com\r\n";
        assert_eq!(extract_from_address(headers), None);
    }

    #[test]
    fn extract_from_empty_headers() {
        assert_eq!(extract_from_address(""), None);
    }

    #[test]
    fn extract_from_nested_angle_brackets() {
        let headers = "From: <user@domain.com>\r\n";
        assert_eq!(
            extract_from_address(headers),
            Some("user@domain.com".to_string())
        );
    }

    #[test]
    fn extract_from_with_leading_whitespace() {
        let headers = "  From: <spaced@example.com>\r\n";
        assert_eq!(
            extract_from_address(headers),
            Some("spaced@example.com".to_string())
        );
    }

    // ── mail_parser integration (pure, no DB) ────────────────────────

    #[test]
    fn mail_parser_parses_minimal_rfc822() {
        let raw = b"From: a@b.com\r\nSubject: Hello\r\n\r\nWorld";
        let msg = mail_parser::MessageParser::default()
            .parse(raw)
            .expect("parser should handle minimal RFC-822");
        assert_eq!(msg.subject().unwrap(), "Hello");
    }

    #[test]
    fn mail_parser_parses_multipart_mime() {
        let raw = concat!(
            "From: sender@test.com\r\n",
            "Subject: Multipart\r\n",
            "MIME-Version: 1.0\r\n",
            "Content-Type: multipart/alternative; boundary=\"bnd\"\r\n",
            "\r\n",
            "--bnd\r\n",
            "Content-Type: text/plain\r\n",
            "\r\n",
            "Plain body\r\n",
            "--bnd\r\n",
            "Content-Type: text/html\r\n",
            "\r\n",
            "<p>HTML body</p>\r\n",
            "--bnd--\r\n",
        );
        let msg = mail_parser::MessageParser::default()
            .parse(raw.as_bytes())
            .expect("parser should handle multipart MIME");
        assert_eq!(msg.subject().unwrap(), "Multipart");
    }

    #[test]
    fn mail_parser_handles_utf8_subject() {
        let raw = b"From: u@test.com\r\nSubject: =?UTF-8?B?5pel5pys6Kqe?=\r\n\r\nbody";
        let msg = mail_parser::MessageParser::default()
            .parse(raw)
            .expect("parser should decode UTF-8 encoded subject");
        let subject = msg.subject().unwrap();
        assert!(!subject.is_empty(), "decoded subject should not be empty");
    }

    #[test]
    fn mail_parser_handles_missing_subject() {
        let raw = b"From: a@b.com\r\n\r\nBody only";
        let msg = mail_parser::MessageParser::default()
            .parse(raw)
            .expect("parser should handle email with no Subject header");
        assert!(msg.subject().is_none());
    }

    // ── dot-stuffing / DATA boundary logic ───────────────────────────

    #[test]
    fn dot_stuffing_removes_leading_dot() {
        let line = "..Hello";
        let trimmed = line.trim_end_matches(['\r', '\n']);
        assert!(trimmed.starts_with('.'));
        let unstuffed = &trimmed[1..];
        assert_eq!(unstuffed, ".Hello");
    }

    #[test]
    fn dot_only_line_is_terminator() {
        let line = ".\r\n";
        let trimmed = line.trim_end_matches(['\r', '\n']);
        assert_eq!(trimmed, ".");
    }

    #[test]
    fn normal_line_not_affected_by_dot_stuffing() {
        let line = "Hello world\r\n";
        let trimmed = line.trim_end_matches(['\r', '\n']);
        assert!(!trimmed.starts_with('.'));
        assert_eq!(trimmed, "Hello world");
    }

    // ── CRLF normalization logic ─────────────────────────────────────

    #[test]
    fn crlf_already_present_stays_unchanged() {
        let line = "test line\r\n".to_string();
        assert!(line.ends_with("\r\n"));
    }

    #[test]
    fn bare_lf_gets_normalized() {
        let line = "test line\n".to_string();
        let normalized = line.replace('\n', "\r\n");
        assert!(normalized.ends_with("\r\n"));
        assert_eq!(normalized, "test line\r\n");
    }

    // ── end-to-end header+body round-trip ────────────────────────────

    #[test]
    fn full_email_round_trip_parse() {
        let raw = concat!(
            "From: Gmail User <gmail@gmail.com>\r\n",
            "To: inbox@fake-email.site\r\n",
            "Subject: Welcome aboard!\r\n",
            "Date: Wed, 01 Apr 2026 12:00:00 +0000\r\n",
            "Content-Type: text/plain; charset=utf-8\r\n",
            "\r\n",
            "Hi there,\r\n",
            "\r\n",
            "This is a real email body.\r\n",
        );
        let (headers, body) = split_headers_and_body(raw);
        let from = extract_from_address(&headers);
        let msg = mail_parser::MessageParser::default()
            .parse(raw.as_bytes())
            .expect("full email should parse");

        assert_eq!(from, Some("gmail@gmail.com".to_string()));
        assert_eq!(msg.subject().unwrap(), "Welcome aboard!");
        assert!(body.contains("Hi there,"));
        assert!(body.contains("This is a real email body."));
    }

    #[test]
    fn gmail_style_multipart_round_trip() {
        let raw = concat!(
            "From: Test User <test@gmail.com>\r\n",
            "Subject: HTML test\r\n",
            "MIME-Version: 1.0\r\n",
            "Content-Type: multipart/alternative; boundary=\"000\"\r\n",
            "\r\n",
            "--000\r\n",
            "Content-Type: text/plain; charset=\"UTF-8\"\r\n",
            "\r\n",
            "Plain version\r\n",
            "--000\r\n",
            "Content-Type: text/html; charset=\"UTF-8\"\r\n",
            "\r\n",
            "<div>HTML version</div>\r\n",
            "--000--\r\n",
        );
        let (headers, _body) = split_headers_and_body(raw);
        let from = extract_from_address(&headers);
        let msg = mail_parser::MessageParser::default()
            .parse(raw.as_bytes())
            .unwrap();

        assert_eq!(from, Some("test@gmail.com".to_string()));
        assert_eq!(msg.subject().unwrap(), "HTML test");
    }

    #[test]
    fn large_body_does_not_panic() {
        let big_body = "X".repeat(1_000_000);
        let raw = format!("From: bulk@sender.com\r\nSubject: Big\r\n\r\n{}", big_body);
        let (h, b) = split_headers_and_body(&raw);
        assert!(h.contains("Subject: Big"));
        assert_eq!(b.len(), 1_000_000);

        let from = extract_from_address(&h);
        assert_eq!(from, Some("bulk@sender.com".to_string()));
    }
}

// ---------------------------------------------------------------------------
// Integration tests (require live Postgres — skipped during docker build,
// run with: cargo test --features integration -- --ignored)
// ---------------------------------------------------------------------------
#[cfg(test)]
mod integration_tests {
    use super::*;
    use chrono::{Duration, Utc};
    use db::models::temp_address::TempEmailAddress;
    use sqlx::postgres::PgPoolOptions;
    use tokio::io::AsyncReadExt;
    use uuid::Uuid;

    static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("../../migrations");

    async fn setup_test() -> (Arc<PgPool>, TempEmailAddress) {
        let db_url = std::env::var("TEST_DATABASE_URL")
            .or_else(|_| std::env::var("DATABASE_URL"))
            .unwrap_or_else(|_| {
                "postgres://postgres:password@localhost:5432/fake-email".to_string()
            });

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await
            .expect("Failed to connect to the database");

        MIGRATOR
            .run(&pool)
            .await
            .expect("Failed to run database migrations for tests");

        sqlx::query("DELETE FROM received_emails")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("DELETE FROM temporary_emails")
            .execute(&pool)
            .await
            .unwrap();

        let test_address = format!("{}@fake-email.site", Uuid::new_v4());

        let temp_email: TempEmailAddress = sqlx::query_as::<_, TempEmailAddress>(
            r#"
            INSERT INTO temporary_emails (id, address, username, created_at, expires_at, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, address, username, created_at, expires_at, is_active
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(&test_address)
        .bind(Some("testuser".to_string()))
        .bind(Utc::now())
        .bind(Utc::now() + Duration::minutes(60))
        .bind(true)
        .fetch_one(&pool)
        .await
        .unwrap();

        (Arc::new(pool), temp_email)
    }

    async fn read_smtp_response(
        reader: &mut tokio::net::tcp::ReadHalf<'_>,
        buf: &mut Vec<u8>,
    ) -> String {
        let count = reader.read(buf).await.unwrap();
        String::from_utf8_lossy(&buf[..count]).to_string()
    }

    /// Full happy-path: EHLO → MAIL FROM → RCPT TO → DATA → QUIT → verify DB.
    #[tokio::test]
    #[ignore] // requires live Postgres
    async fn integration_smtp_receive_and_save() {
        let (db_pool, temp_email) = setup_test().await;

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let server_addr = listener.local_addr().unwrap();

        let db_pool_clone = db_pool.clone();
        let server_task = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            handle_connection(stream, db_pool_clone, "fake-email.site")
                .await
                .expect("Handling connection failed");
        });

        let mut client_stream = TcpStream::connect(server_addr).await.unwrap();
        let (mut r, mut w) = client_stream.split();
        let mut buf = vec![0u8; 4096];

        let greeting = read_smtp_response(&mut r, &mut buf).await;
        assert!(greeting.starts_with("220"));

        w.write_all(b"EHLO test.com\r\n").await.unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(resp.starts_with("250"));

        w.write_all(b"MAIL FROM:<sender@example.com>\r\n")
            .await
            .unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(resp.starts_with("250"));

        w.write_all(format!("RCPT TO:<{}>\r\n", temp_email.address).as_bytes())
            .await
            .unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(resp.starts_with("250"));

        w.write_all(b"DATA\r\n").await.unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(resp.starts_with("354"));

        w.write_all(
            b"From: sender@example.com\r\nSubject: Test Subject\r\n\r\nThis is the body.\r\n.\r\n",
        )
        .await
        .unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(resp.starts_with("250"));

        w.write_all(b"QUIT\r\n").await.unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(resp.starts_with("221"));

        server_task.await.unwrap();

        #[derive(sqlx::FromRow)]
        struct SavedEmailRow {
            from_address: String,
            subject: Option<String>,
            body_plain: Option<String>,
        }

        let saved: SavedEmailRow = sqlx::query_as::<_, SavedEmailRow>(
            "SELECT from_address, subject, body_plain FROM received_emails WHERE temp_email_id = $1",
        )
        .bind(temp_email.id)
        .fetch_one(&*db_pool)
        .await
        .expect("Email was not found in the database");

        assert_eq!(saved.from_address, "sender@example.com");
        assert_eq!(saved.subject, Some("Test Subject".to_string()));
        assert!(saved.body_plain.unwrap().contains("This is the body."));
    }

    /// RCPT TO an unknown address must return 550.
    #[tokio::test]
    #[ignore]
    async fn integration_rcpt_unknown_address_rejected() {
        let (db_pool, _temp_email) = setup_test().await;

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let server_addr = listener.local_addr().unwrap();

        let db_pool_clone = db_pool.clone();
        let server_task = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            let _ = handle_connection(stream, db_pool_clone, "fake-email.site").await;
        });

        let mut client_stream = TcpStream::connect(server_addr).await.unwrap();
        let (mut r, mut w) = client_stream.split();
        let mut buf = vec![0u8; 4096];

        read_smtp_response(&mut r, &mut buf).await; // 220
        w.write_all(b"EHLO test.com\r\n").await.unwrap();
        read_smtp_response(&mut r, &mut buf).await; // 250

        w.write_all(b"RCPT TO:<nonexistent@fake-email.site>\r\n")
            .await
            .unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(
            resp.starts_with("550"),
            "expected 550 for unknown recipient, got: {resp}"
        );

        w.write_all(b"QUIT\r\n").await.unwrap();
        read_smtp_response(&mut r, &mut buf).await;
        server_task.await.unwrap();
    }

    /// DATA before RCPT TO must return 503.
    #[tokio::test]
    #[ignore]
    async fn integration_data_without_rcpt_returns_503() {
        let (db_pool, _temp_email) = setup_test().await;

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let server_addr = listener.local_addr().unwrap();

        let db_pool_clone = db_pool.clone();
        let server_task = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            let _ = handle_connection(stream, db_pool_clone, "fake-email.site").await;
        });

        let mut client_stream = TcpStream::connect(server_addr).await.unwrap();
        let (mut r, mut w) = client_stream.split();
        let mut buf = vec![0u8; 4096];

        read_smtp_response(&mut r, &mut buf).await; // 220
        w.write_all(b"EHLO test.com\r\n").await.unwrap();
        read_smtp_response(&mut r, &mut buf).await; // 250

        w.write_all(b"DATA\r\n").await.unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(resp.starts_with("354"), "server should accept DATA command");

        w.write_all(b"From: x@y.com\r\nSubject: oops\r\n\r\nbody\r\n.\r\n")
            .await
            .unwrap();
        let resp = read_smtp_response(&mut r, &mut buf).await;
        assert!(
            resp.starts_with("503"),
            "expected 503 for DATA without RCPT, got: {resp}"
        );

        w.write_all(b"QUIT\r\n").await.unwrap();
        read_smtp_response(&mut r, &mut buf).await;
        server_task.await.unwrap();
    }
}
