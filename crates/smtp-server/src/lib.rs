use mail_parser::MessageParser;
use sqlx::PgPool;
use std::sync::Arc;
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tracing::{debug, error, info, instrument};

/// Top-level error for the SMTP server.
#[derive(Error, Debug)]
pub enum SmtpServerError {
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Database error: {0}")]
    DbError(#[from] sqlx::Error),
    #[error("Failed to parse email content")]
    ParseError,
}

/// Represents the state of an SMTP session.
pub enum SmtpState {
    /// Initial state, waiting for HELO/EHLO.
    Greeting,
    /// Ready to receive commands after greeting.
    Ready,
    /// Received `MAIL FROM`, waiting for `RCPT TO`.
    ReceivingRcpt(String),
    /// Received `RCPT TO`, waiting for `DATA` or more `RCPT TO`.
    ReceivingData(String, Vec<String>),
    /// Received `DATA`, accumulating email content.
    ReadingData(String, Vec<String>, Vec<u8>),
}

/// The main entry point for the SMTP server.
/// It binds to the port and enters a loop to accept new connections.

pub async fn run_smtp_server(db_pool: Arc<PgPool>) -> Result<(), SmtpServerError> {
    let port = std::env::var("SMTP_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(2525);
    let addr = format!("0.0.0.0:{}", port);

    let listener = TcpListener::bind(&addr).await?;
    info!("Custom SMTP Server listening on {}", addr);

    loop {
        let (stream, addr) = listener.accept().await?;
        let db_pool_clone = Arc::clone(&db_pool);

        tokio::spawn(async move {
            info!("Accepted connection from: {}", addr);
            if let Err(e) = handle_connection(stream, db_pool_clone).await {
                error!("SMTP connection error: {:?}", e);
            }
            info!("Closing connection from: {}", addr);
        });
    }
}

/// Handles a single client connection, processing SMTP commands using a state machine.
#[instrument(skip(stream, db_pool))]
async fn handle_connection(stream: TcpStream, db_pool: Arc<PgPool>) -> Result<(), SmtpServerError> {
    let mut reader = BufReader::new(stream);
    let mut state = SmtpState::Greeting;

    write_line(&mut reader, "220 fake-email.com Service Ready").await?;

    loop {
        let mut line = String::new();
        let bytes_read = reader.read_line(&mut line).await?;
        if bytes_read == 0 {
            break; // Connection closed
        }

        let command = line.trim();
        debug!("<- {}", command);

        state = match process_command(command, state, &mut reader, &db_pool).await? {
            Some(new_state) => new_state,
            None => break, // QUIT command received
        };
    }

    Ok(())
}

/// Processes a single SMTP command based on the current state.
async fn process_command(
    cmd: &str,
    state: SmtpState,
    reader: &mut BufReader<TcpStream>,
    db: &PgPool,
) -> Result<Option<SmtpState>, SmtpServerError> {
    match state {
        SmtpState::Greeting => match cmd {
            c if c.starts_with("HELO") || c.starts_with("EHLO") => {
                write_line(reader, "250 OK").await?;
                Ok(Some(SmtpState::Ready))
            }
            _ => handle_bad_sequence(reader, cmd).await,
        },
        SmtpState::Ready => match cmd {
            c if c.starts_with("MAIL FROM") => {
                let from = parse_email_from_command(c);
                write_line(reader, "250 OK").await?;
                Ok(Some(SmtpState::ReceivingRcpt(from)))
            }
            "QUIT" => handle_quit(reader).await,
            _ => handle_bad_sequence(reader, cmd).await,
        },
        SmtpState::ReceivingRcpt(from) => match cmd {
            c if c.starts_with("RCPT TO") => {
                let to = parse_email_from_command(c);
                write_line(reader, "250 OK").await?;
                Ok(Some(SmtpState::ReceivingData(from, vec![to])))
            }
            "QUIT" => handle_quit(reader).await,
            _ => handle_bad_sequence(reader, cmd).await,
        },
        SmtpState::ReceivingData(from, mut to_list) => match cmd {
            c if c.starts_with("RCPT TO") => {
                to_list.push(parse_email_from_command(c));
                write_line(reader, "250 OK").await?;
                Ok(Some(SmtpState::ReceivingData(from, to_list)))
            }
            "DATA" => {
                write_line(reader, "354 End data with <CR><LF>.<CR><LF>").await?;
                Ok(Some(SmtpState::ReadingData(from, to_list, Vec::new())))
            }
            "QUIT" => handle_quit(reader).await,
            _ => handle_bad_sequence(reader, cmd).await,
        },
        SmtpState::ReadingData(from, to_list, mut data) => {
            // This state is special; we're not reading commands but email data.
            let mut data_lines = Vec::new();
            data_lines.push(cmd.to_string()); // Push the first line that was read

            loop {
                let mut data_line = String::new();
                reader.read_line(&mut data_line).await?;
                let trimmed = data_line.trim_end_matches(['\r', '\n']);
                if trimmed == "." {
                    break;
                }
                data_lines.push(data_line);
            }

            let raw_email = data_lines.join("\r\n");
            let email_bytes = raw_email.as_bytes();

            // Find the valid recipient for this service
            let mut valid_temp_address: Option<db::models::temp_address::TempEmailAddress> = None;
            for recipient in &to_list {
                if let Some(addr) =
                    db::services::temp_address::find_by_address(db, recipient).await?
                {
                    valid_temp_address = Some(addr);
                    break;
                }
            }

            if let Some(temp_addr) = valid_temp_address {
                save_email(db, &temp_addr, email_bytes).await?;
                write_line(reader, "250 OK: Email accepted").await?;
            } else {
                write_line(reader, "550 User not local").await?;
            }

            Ok(Some(SmtpState::Ready))
        }
    }
}

/// Saves a raw email to the database for a given recipient.
async fn save_email(
    db: &PgPool,
    temp_address: &db::models::temp_address::TempEmailAddress,
    raw_email: &[u8],
) -> Result<(), SmtpServerError> {
    let message = match MessageParser::default().parse(raw_email) {
        Ok(msg) => msg,
        Err(e) => {
            error!("Failed to parse email for {}: {}", temp_address.address, e);
            return Err(SmtpServerError::ParseError);
        }
    };

    // Extract the 'from' address into an owned String so it has a stable lifetime.
    let from_address_str = message
        .from()
        .and_then(|addr| addr.first())
        .and_then(|a| a.address.as_ref())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let new_email = db::models::email::NewReceivedEmail {
        temp_email_id: temp_address.id,
        from_address: &from_address_str, // Borrow the String.
        subject: message.subject(),
        body_plain: message.body_text(0).map(|s| s.to_string()),
        body_html: message.body_html(0).map(|s| s.to_string()),
        headers: serde_json::Value::Object(serde_json::Map::new()), // Simplified
        size_bytes: raw_email.len() as i32,
    };

    db::services::email::save_received_email(db, &new_email).await?;
    info!("Successfully saved email for {}", temp_address.address);
    Ok(())
}

// --- Command Helpers ---

fn parse_email_from_command(command: &str) -> String {
    if let Some(start) = command.find('<') {
        if let Some(end) = command.find('>') {
            return command[start + 1..end].to_string();
        }
    }
    "".to_string()
}

async fn handle_quit(
    reader: &mut BufReader<TcpStream>,
) -> Result<Option<SmtpState>, SmtpServerError> {
    write_line(reader, "221 Bye").await?;
    Ok(None) // Signal to close connection
}

async fn handle_bad_sequence(
    reader: &mut BufReader<TcpStream>,
    cmd: &str,
) -> Result<Option<SmtpState>, SmtpServerError> {
    error!("Bad command sequence: {}", cmd);
    write_line(reader, "503 Bad sequence of commands").await?;
    Err(SmtpServerError::IoError(std::io::Error::new(
        std::io::ErrorKind::InvalidData,
        "Bad SMTP command sequence",
    )))
}

/// Helper function to write a line back to the client.
async fn write_line(reader: &mut BufReader<TcpStream>, s: &str) -> Result<(), SmtpServerError> {
    debug!("-> {}", s);
    reader.get_mut().write_all(s.as_bytes()).await?;
    reader.get_mut().write_all(b"\r\n").await?;
    reader.get_mut().flush().await?;
    Ok(())
}
