use db::{find_temporary_email_by_addr, insert_received_email};
use mail_parser::MessageParser;
use sqlx::postgres::PgPool;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};

const MAX_LINE_LEN: usize = 4096;
const MAX_DATA_BYTES: usize = 10 * 1024 * 1024;

#[derive(Clone)]
struct Recipient {
    id: uuid::Uuid,
    addr: String,
}

pub async fn run_server(host: &str, port: u16, pool: PgPool) -> Result<(), std::io::Error> {
    let listener = TcpListener::bind((host, port)).await?;
    tracing::info!(%host, port, "smtp listening");
    run_server_on_listener(listener, pool).await
}

pub async fn run_server_on_listener(
    listener: TcpListener,
    pool: PgPool,
) -> Result<(), std::io::Error> {
    loop {
        let (socket, _) = listener.accept().await?;
        let pool = pool.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_client(socket, pool).await {
                tracing::error!(error = %e, "smtp session failed");
            }
        });
    }
}

async fn read_limited_line(
    reader: &mut BufReader<tokio::net::tcp::OwnedReadHalf>,
    buf: &mut String,
) -> Result<usize, std::io::Error> {
    buf.clear();
    let n = reader.read_line(buf).await?;
    if n > MAX_LINE_LEN {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "line exceeds maximum length",
        ));
    }
    Ok(n)
}

async fn handle_client(socket: TcpStream, pool: PgPool) -> Result<(), std::io::Error> {
    let (reader, mut writer) = socket.into_split();
    let mut reader = BufReader::new(reader);

    writer.write_all(b"220 fake-email smtp ready\r\n").await?;

    let mut mail_from: Option<String> = None;
    let mut recipients: Vec<Recipient> = Vec::new();
    let mut in_data = false;
    let mut data_buf = String::new();
    let mut line = String::new();

    loop {
        let n = read_limited_line(&mut reader, &mut line).await?;
        if n == 0 {
            break;
        }

        let cmd = line.trim_end_matches(['\r', '\n']);

        if in_data {
            if cmd == "." {
                persist_message(&pool, mail_from.as_deref(), &recipients, &data_buf).await;
                data_buf.clear();
                mail_from = None;
                recipients.clear();
                in_data = false;
                writer.write_all(b"250 queued\r\n").await?;
            } else {
                if data_buf.len() + cmd.len() + 2 > MAX_DATA_BYTES {
                    data_buf.clear();
                    in_data = false;
                    mail_from = None;
                    recipients.clear();
                    writer.write_all(b"552 message too large\r\n").await?;
                    continue;
                }
                let destuffed = cmd.strip_prefix('.').unwrap_or(cmd);
                data_buf.push_str(destuffed);
                data_buf.push_str("\r\n");
            }
            continue;
        }

        let upper = cmd.to_ascii_uppercase();

        if upper.starts_with("EHLO") || upper.starts_with("HELO") {
            writer.write_all(b"250 fake-email\r\n").await?;
            continue;
        }

        if upper == "RSET" {
            mail_from = None;
            recipients.clear();
            writer.write_all(b"250 reset\r\n").await?;
            continue;
        }

        if upper == "QUIT" {
            writer.write_all(b"221 bye\r\n").await?;
            break;
        }

        if upper.starts_with("MAIL FROM:") {
            let Some(addr) = extract_path(cmd) else {
                writer.write_all(b"501 bad MAIL FROM\r\n").await?;
                continue;
            };
            mail_from = Some(addr);
            recipients.clear();
            writer.write_all(b"250 ok\r\n").await?;
            continue;
        }

        if upper.starts_with("RCPT TO:") {
            if mail_from.is_none() {
                writer.write_all(b"503 MAIL FROM required first\r\n").await?;
                continue;
            }
            let Some(addr) = extract_path(cmd) else {
                writer.write_all(b"501 bad RCPT TO\r\n").await?;
                continue;
            };

            let addr_lower = addr.to_ascii_lowercase();

            match find_temporary_email_by_addr(&pool, &addr_lower).await {
                Ok(Some(temp)) => {
                    recipients.push(Recipient { id: temp.id, addr: addr_lower });
                    writer.write_all(b"250 ok\r\n").await?;
                }
                Ok(None) => {
                    writer.write_all(b"550 unknown recipient\r\n").await?;
                }
                Err(_) => {
                    writer.write_all(b"451 temporary local error\r\n").await?;
                }
            }
            continue;
        }

        if upper == "DATA" {
            if recipients.is_empty() {
                writer.write_all(b"554 no valid recipients\r\n").await?;
                continue;
            }
            in_data = true;
            data_buf.clear();
            writer.write_all(b"354 end with <CRLF>.<CRLF>\r\n").await?;
            continue;
        }

        writer.write_all(b"500 command not recognized\r\n").await?;
    }

    Ok(())
}

async fn persist_message(pool: &PgPool, from_addr: Option<&str>, rcpts: &[Recipient], raw: &str) {
    let parsed = MessageParser::default().parse(raw.as_bytes());
    let subject = parsed.as_ref().and_then(|m| m.subject()).map(|s| s.to_string());
    let body_text = parsed.as_ref().and_then(|m| m.body_text(0)).map(|s| s.into_owned());

    for rcpt in rcpts {
        if let Err(e) = insert_received_email(
            pool,
            rcpt.id,
            from_addr,
            Some(&rcpt.addr),
            subject.as_deref(),
            body_text.as_deref(),
        )
        .await
        {
            tracing::error!(error = %e, rcpt = %rcpt.addr, "failed to persist email");
        }
    }
}

fn extract_path(cmd: &str) -> Option<String> {
    let start = cmd.find('<')?;
    let end = cmd[start + 1..].find('>')? + start + 1;
    let value = cmd[start + 1..end].trim();
    if value.is_empty() { None } else { Some(value.to_string()) }
}
