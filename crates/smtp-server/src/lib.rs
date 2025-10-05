use mail_parser::MessageParser;
use sqlx::PgPool;
use std::env;
use std::sync::Arc;
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
    let listener = TcpListener::bind("127.0.0.1:2525").await?;
    println!("Custom SMTP Server listening on 127.0.0.1:2525");

    loop {
        let (stream, _addr) = listener.accept().await?;
        let db_pool_clone = Arc::clone(&db_pool);

        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, db_pool_clone).await {
                eprintln!("SMTP connection error: {:?}", e);
            }
        });
    }
}

/// Handles a single client connection, processing SMTP commands.
async fn handle_connection(stream: TcpStream, db_pool: Arc<PgPool>) -> Result<(), SmtpServerError> {
    let mut reader = BufReader::new(stream);

    write_line(&mut reader, "220 fake-email.com Service Ready").await?;

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
                    // Ensure normalized CRLF for parsing consistency
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

            let recipient_addr = match recipient.as_ref() {
                Some(r) => r,
                None => {
                    eprintln!("No recipient specified before DATA command.");
                    write_line(&mut reader, "503 Bad sequence of commands").await?;
                    continue;
                }
            };

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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};
    use db::models::temp_address::TempEmailAddress;
    use sqlx::postgres::PgPoolOptions;
    use tokio::io::AsyncReadExt;
    use uuid::Uuid;

    // Embed workspace migrations so tests are self-contained and always up to date.
    static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("../../migrations");

    /// This function sets up a test database connection and prepares the data needed for a test run.
    /// It cleans up old data and creates a fresh temporary email address for the test.
    async fn setup_test() -> (Arc<PgPool>, TempEmailAddress) {
        // Prefer TEST_DATABASE_URL, then DATABASE_URL, then a sensible default.
        let db_url = std::env::var("TEST_DATABASE_URL")
            .or_else(|_| std::env::var("DATABASE_URL"))
            .unwrap_or_else(|_| {
                "postgres://postgres:password@localhost:5432/fake-email".to_string()
            });

        // Connect to DB and run migrations to ensure schema exists.
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await
            .expect("Failed to connect to the database");

        MIGRATOR
            .run(&pool)
            .await
            .expect("Failed to run database migrations for tests");

        // Clean up any data from previous test runs
        sqlx::query("DELETE FROM received_emails")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("DELETE FROM temporary_emails")
            .execute(&pool)
            .await
            .unwrap();

        let test_address = format!("{}@fake-email.com", Uuid::new_v4());

        // Create a temporary email address required for the email to be accepted
        let temp_email = sqlx::query_as!(
            TempEmailAddress,
            r#"
            INSERT INTO temporary_emails (id, address, username, created_at, expires_at, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, address, username, created_at, expires_at, is_active
            "#,
            Uuid::new_v4(),
            test_address,
            Some("testuser".to_string()),
            Utc::now(),
            Utc::now() + Duration::minutes(60),
            true
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        (Arc::new(pool), temp_email)
    }

    /// This is the integration test. It simulates a full SMTP conversation.
    #[tokio::test]
    async fn test_smtp_receive_and_save() {
        // 1. SETUP: Get a database pool and a valid recipient address.
        let (db_pool, temp_email) = setup_test().await;

        // Bind to port 0 to let the OS choose a free port.
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let server_addr = listener.local_addr().unwrap();

        // 2. ACT (Part 1): Run the server to handle ONE connection.
        // We spawn our connection handler in the background.
        let db_pool_clone = db_pool.clone();
        let server_task = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            handle_connection(stream, db_pool_clone)
                .await
                .expect("Handling connection failed");
        });

        // 2. ACT (Part 2): Act as the client.
        // Connect to the server and send a test email.
        let mut client_stream = TcpStream::connect(server_addr).await.unwrap();
        let (mut client_reader, mut client_writer) = client_stream.split();

        let mut response = vec![0; 1024];
        async fn read_and_assert(
            reader: &mut tokio::net::tcp::ReadHalf<'_>,
            buf: &mut Vec<u8>,
            expected_code: &str,
        ) {
            let count = reader.read(buf).await.unwrap();
            let response_str = String::from_utf8_lossy(&buf[..count]);
            assert!(response_str.starts_with(expected_code));
        }

        read_and_assert(&mut client_reader, &mut response, "220").await; // Wait for greeting

        client_writer
            .write_all(
                b"HELO test.com
",
            )
            .await
            .unwrap();
        read_and_assert(&mut client_reader, &mut response, "250").await;

        client_writer
            .write_all(
                b"MAIL FROM:<sender@example.com>
",
            )
            .await
            .unwrap();
        read_and_assert(&mut client_reader, &mut response, "250").await;

        let rcpt_to_command = format!(
            "RCPT TO:<{}>
",
            temp_email.address
        );
        client_writer
            .write_all(rcpt_to_command.as_bytes())
            .await
            .unwrap();
        read_and_assert(&mut client_reader, &mut response, "250").await;

        client_writer
            .write_all(
                b"DATA
",
            )
            .await
            .unwrap();
        read_and_assert(&mut client_reader, &mut response, "354").await;

        // This is the full, raw email content.
        let email_data = concat!(
            "From: sender@example.com
",
            "Subject: Test Subject
",
            "
",
            "This is the body.
",
            ".This line starts with a dot (dot-stuffing test).
"
        );

        client_writer
            .write_all(
                format!(
                    "{}
.
",
                    email_data
                )
                .as_bytes(),
            )
            .await
            .unwrap();
        read_and_assert(&mut client_reader, &mut response, "250").await;

        client_writer
            .write_all(
                b"QUIT
",
            )
            .await
            .unwrap();
        read_and_assert(&mut client_reader, &mut response, "221").await;

        // Wait for the server to finish processing.
        server_task.await.unwrap();

        // 3. ASSERT: Check the database to confirm the email was saved correctly.
        let saved_email = sqlx::query!(
            "SELECT from_address, subject, body_plain FROM received_emails WHERE temp_email_id = $1",
            temp_email.id
        )
        .fetch_one(&*db_pool)
        .await
        .expect("Email was not found in the database");

        assert_eq!(saved_email.from_address, "sender@example.com");
        assert_eq!(saved_email.subject, Some("Test Subject".to_string()));

        // Note: The body includes the un-stuffed line.
        let expected_body = "This is the body.
This line starts with a dot (dot-stuffing test).
";
        assert_eq!(saved_email.body_plain, Some(expected_body.to_string()));

        println!("Integration test passed: Email correctly received, parsed, and saved.");
    }
}
