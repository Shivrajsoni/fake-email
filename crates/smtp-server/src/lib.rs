mod parse;
mod rfc5321;

use rfc5321::{
    domain_matches, domain_of_recipient, parse_mail_from_command, parse_rcpt_to_command,
    read_smtp_data, DataReadError,
};
use sqlx::PgPool;
use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::time::timeout;
use tracing::{debug, error, info};

fn env_parse<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

fn cmd4(cmd: &str, verb: &str) -> bool {
    cmd.len() >= 4 && cmd[..4].eq_ignore_ascii_case(verb)
}

fn is_mail_from_line(cmd: &str) -> bool {
    cmd4(cmd, "MAIL") && cmd.to_ascii_uppercase().contains("MAIL FROM")
}

#[derive(Clone)]
pub struct SmtpListenerConfig {
    pub service_domain: String,
    pub banner_hostname: String,
    pub listen_port: u16,
    pub max_message_bytes: usize,
    pub command_read_timeout: Duration,
    pub data_read_timeout: Duration,
}

impl SmtpListenerConfig {
    pub fn from_env() -> Self {
        let service_domain = std::env::var("DOMAIN")
            .expect("DOMAIN must be set (inbound recipient domain)")
            .to_ascii_lowercase();
        let banner_hostname =
            std::env::var("SMTP_BANNER_HOST").unwrap_or_else(|_| service_domain.clone());
        Self {
            service_domain,
            banner_hostname,
            listen_port: env_parse("SMTP_PORT", 25u16),
            max_message_bytes: env_parse("SMTP_MAX_MESSAGE_BYTES", 10_485_760usize),
            command_read_timeout: Duration::from_secs(env_parse(
                "SMTP_COMMAND_TIMEOUT_SECS",
                120_u64,
            )),
            data_read_timeout: Duration::from_secs(env_parse("SMTP_DATA_TIMEOUT_SECS", 300_u64)),
        }
    }
}

#[derive(Error, Debug)]
pub enum SmtpServerError {
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    #[error(transparent)]
    Db(#[from] db::services::error::DbError),

    #[error("SMTP DATA: message exceeds maximum size")]
    MessageTooLarge,

    #[error("SMTP DATA: read timed out")]
    DataTimeout,

    #[error("SMTP DATA: connection closed unexpectedly")]
    UnexpectedEof,

    #[error("Bad SMTP command sequence")]
    BadSequence,

    #[error("Failed to parse message (RFC 5322 / MIME)")]
    ParseError,
}

impl From<DataReadError> for SmtpServerError {
    fn from(e: DataReadError) -> Self {
        match e {
            DataReadError::Io(e) => SmtpServerError::IoError(e),
            DataReadError::UnexpectedEof => SmtpServerError::UnexpectedEof,
            DataReadError::MessageTooLarge => SmtpServerError::MessageTooLarge,
            DataReadError::Timeout => SmtpServerError::DataTimeout,
        }
    }
}

impl From<parse::ParseError> for SmtpServerError {
    fn from(_: parse::ParseError) -> Self {
        SmtpServerError::ParseError
    }
}

#[derive(Debug, Clone)]
pub enum SmtpState {
    Greeting,
    Ready,
    /// After MAIL FROM: collect RCPT TO (one or many), then DATA.
    MailTransaction {
        mail_from: String,
        rcpt_to: Vec<String>,
    },
}

pub async fn run_smtp_server(
    db_pool: Arc<PgPool>,
    cfg: SmtpListenerConfig,
) -> Result<(), SmtpServerError> {
    let addr = format!("0.0.0.0:{}", cfg.listen_port);

    let listener = TcpListener::bind(&addr).await?;
    info!(
        port = cfg.listen_port,
        domain = %cfg.service_domain,
        max_bytes = cfg.max_message_bytes,
        "SMTP listening for inbound mail to our domain"
    );

    loop {
        let (stream, peer) = listener.accept().await?;
        let db_pool_clone = Arc::clone(&db_pool);
        let cfg_clone = cfg.clone();

        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, db_pool_clone, cfg_clone).await {
                error!(%peer, ?e, "smtp session error");
            }
        });
    }
}

async fn handle_connection(
    stream: TcpStream,
    db_pool: Arc<PgPool>,
    cfg: SmtpListenerConfig,
) -> Result<(), SmtpServerError> {
    let mut reader = BufReader::new(stream);
    let mut state = SmtpState::Greeting;

    write_line(
        &mut reader,
        &format!("220 {} ESMTP ready", cfg.banner_hostname),
    )
    .await?;

    loop {
        let mut line = String::new();
        let n = timeout(cfg.command_read_timeout, reader.read_line(&mut line))
            .await
            .map_err(|_| SmtpServerError::DataTimeout)??;

        if n == 0 {
            break;
        }

        let command = line.trim_end_matches(['\r', '\n']);
        debug!("<- {}", command);

        state = match process_command(command, state, &mut reader, &db_pool, &cfg).await? {
            Some(new_state) => new_state,
            None => break,
        };
    }

    Ok(())
}

async fn ehlo_or_helo_reply(
    reader: &mut BufReader<TcpStream>,
    cfg: &SmtpListenerConfig,
    state: &SmtpState,
    extended: bool,
) -> Result<SmtpState, SmtpServerError> {
    if extended {
        write_ehlo(reader, &cfg.banner_hostname, cfg.max_message_bytes).await?;
    } else {
        write_line(reader, &format!("250 {} greets you", cfg.banner_hostname)).await?;
    }
    Ok(match state {
        SmtpState::Greeting => SmtpState::Ready,
        other => other.clone(),
    })
}

/// Shared commands; `None` = fall through to state-specific handling.
async fn dispatch_universal(
    cmd_trim: &str,
    state: &SmtpState,
    reader: &mut BufReader<TcpStream>,
    cfg: &SmtpListenerConfig,
) -> Result<Option<SmtpState>, SmtpServerError> {
    if cmd4(cmd_trim, "EHLO") {
        return Ok(Some(ehlo_or_helo_reply(reader, cfg, state, true).await?));
    }
    if cmd4(cmd_trim, "HELO") {
        return Ok(Some(ehlo_or_helo_reply(reader, cfg, state, false).await?));
    }
    if cmd_trim.eq_ignore_ascii_case("NOOP") {
        write_line(reader, "250 OK").await?;
        return Ok(Some(state.clone()));
    }
    if cmd_trim.eq_ignore_ascii_case("RSET") {
        return Ok(if matches!(state, SmtpState::Greeting) {
            None
        } else {
            write_line(reader, "250 OK").await?;
            Some(SmtpState::Ready)
        });
    }
    if cmd4(cmd_trim, "VRFY") || cmd4(cmd_trim, "EXPN") {
        return Ok(if matches!(state, SmtpState::Greeting) {
            None
        } else {
            write_line(reader, "502 5.5.1 Command not implemented").await?;
            Some(state.clone())
        });
    }
    if cmd_trim.eq_ignore_ascii_case("HELP") {
        return Ok(if matches!(state, SmtpState::Greeting) {
            None
        } else {
            write_line(reader, "214 See RFC 5321").await?;
            Some(state.clone())
        });
    }
    Ok(None)
}

async fn accept_mail_from(
    cmd_trim: &str,
    reader: &mut BufReader<TcpStream>,
    cfg: &SmtpListenerConfig,
) -> Result<SmtpState, SmtpServerError> {
    let (from_path, declared) = parse_mail_from_command(cmd_trim);
    if let Some(sz) = declared {
        if sz > cfg.max_message_bytes as u64 {
            write_line(reader, "552 5.3.4 Message size exceeds fixed maximum size").await?;
            return Ok(SmtpState::Ready);
        }
    }
    write_line(reader, "250 OK").await?;
    Ok(SmtpState::MailTransaction {
        mail_from: from_path,
        rcpt_to: Vec::new(),
    })
}

async fn process_command(
    cmd: &str,
    state: SmtpState,
    reader: &mut BufReader<TcpStream>,
    db: &PgPool,
    cfg: &SmtpListenerConfig,
) -> Result<Option<SmtpState>, SmtpServerError> {
    let cmd_trim = cmd.trim();
    if cmd_trim.is_empty() {
        return Ok(Some(state));
    }

    if cmd_trim.eq_ignore_ascii_case("QUIT") {
        return handle_quit(reader).await;
    }

    if let Some(next) = dispatch_universal(cmd_trim, &state, reader, cfg).await? {
        return Ok(Some(next));
    }

    match state {
        SmtpState::Greeting => handle_bad_sequence(reader, cmd_trim).await,
        SmtpState::Ready => {
            if is_mail_from_line(cmd_trim) {
                return Ok(Some(accept_mail_from(cmd_trim, reader, cfg).await?));
            }
            handle_bad_sequence(reader, cmd_trim).await
        }
        SmtpState::MailTransaction {
            mail_from: envelope_from,
            mut rcpt_to,
        } => {
            if is_mail_from_line(cmd_trim) {
                return Ok(Some(accept_mail_from(cmd_trim, reader, cfg).await?));
            }
            if cmd_trim.to_ascii_uppercase().contains("RCPT TO") {
                let to = parse_rcpt_to_command(cmd_trim);
                rcpt_to.push(to);
                write_line(reader, "250 OK").await?;
                return Ok(Some(SmtpState::MailTransaction {
                    mail_from: envelope_from,
                    rcpt_to,
                }));
            }
            if cmd_trim.eq_ignore_ascii_case("DATA") {
                if rcpt_to.is_empty() {
                    write_line(reader, "503 Bad sequence of commands").await?;
                    return Err(SmtpServerError::BadSequence);
                }
                write_line(reader, "354 Start mail input; end with <CRLF>.<CRLF>").await?;
                let raw = match read_smtp_data(reader, cfg.max_message_bytes, cfg.data_read_timeout)
                    .await
                {
                    Ok(b) => b,
                    Err(e) => {
                        let _ = write_line(reader, "554 Transaction failed").await;
                        return Err(e.into());
                    }
                };

                match deliver_to_local_mailboxes(
                    db,
                    &cfg.service_domain,
                    &envelope_from,
                    &rcpt_to,
                    &raw,
                )
                .await
                {
                    Ok(0) => {
                        write_line(reader, "550 5.1.1 No valid recipient for our domain").await?;
                    }
                    Ok(n) => {
                        write_line(
                            reader,
                            &format!("250 OK: message accepted for {} recipient(s)", n),
                        )
                        .await?;
                    }
                    Err(e) => {
                        let _ = write_line(reader, "451 Requested action aborted").await;
                        return Err(e);
                    }
                }

                return Ok(Some(SmtpState::Ready));
            }
            handle_bad_sequence(reader, cmd_trim).await
        }
    }
}

/// Resolves RCPTs that are for `our_domain` and match an active temporary mailbox; stores one row per mailbox.
async fn deliver_to_local_mailboxes(
    db: &PgPool,
    our_domain: &str,
    mail_from: &str,
    recipients: &[String],
    raw_message: &[u8],
) -> Result<usize, SmtpServerError> {
    let mut seen = HashSet::new();
    let mut mailboxes = Vec::new();

    for r in recipients {
        let rcpt = r.trim().to_ascii_lowercase();
        if rcpt.is_empty() {
            continue;
        }
        let Some(dom) = domain_of_recipient(&rcpt) else {
            continue;
        };
        if !domain_matches(&dom, our_domain) {
            debug!(%rcpt, "skipping recipient: not our domain");
            continue;
        }
        if !seen.insert(rcpt.clone()) {
            continue;
        }
        let found = db::services::temp_address::find_by_address(db, &rcpt).await?;
        if let Some(mb) = found {
            mailboxes.push(mb);
        }
    }

    if mailboxes.is_empty() {
        return Ok(0);
    }

    let parsed = parse::parse_inbound_bytes(raw_message, mail_from)?;

    let mut tx = db
        .begin()
        .await
        .map_err(db::services::error::DbError::from)?;
    let mut count = 0usize;
    for mb in mailboxes {
        let new_email = db::models::email::NewReceivedEmail {
            temp_email_id: mb.id,
            from_address: &parsed.from_address,
            subject: parsed.subject.as_deref(),
            body_plain: parsed.body_plain.clone(),
            body_html: parsed.body_html.clone(),
            headers: parsed.headers.clone(),
            size_bytes: parsed.size_bytes,
        };
        db::services::email::insert_received(&mut *tx, &new_email).await?;
        count += 1;
        info!(address = %mb.address, "stored inbound message for mailbox");
    }
    tx.commit()
        .await
        .map_err(db::services::error::DbError::from)?;
    Ok(count)
}

async fn write_ehlo(
    reader: &mut BufReader<TcpStream>,
    host: &str,
    max_size: usize,
) -> Result<(), SmtpServerError> {
    write_line(reader, &format!("250-{host} Hello, pleased to meet you")).await?;
    write_line(reader, &format!("250-SIZE {max_size}")).await?;
    write_line(reader, "250-8BITMIME").await?;
    write_line(reader, "250 HELP").await?;
    Ok(())
}

async fn handle_quit(
    reader: &mut BufReader<TcpStream>,
) -> Result<Option<SmtpState>, SmtpServerError> {
    write_line(reader, "221 Bye").await?;
    Ok(None)
}

async fn handle_bad_sequence(
    reader: &mut BufReader<TcpStream>,
    cmd: &str,
) -> Result<Option<SmtpState>, SmtpServerError> {
    error!("Bad command sequence: {}", cmd);
    write_line(reader, "503 Bad sequence of commands").await?;
    Err(SmtpServerError::BadSequence)
}

async fn write_line(reader: &mut BufReader<TcpStream>, s: &str) -> Result<(), SmtpServerError> {
    debug!("-> {}", s);
    reader.get_mut().write_all(s.as_bytes()).await?;
    reader.get_mut().write_all(b"\r\n").await?;
    reader.get_mut().flush().await?;
    Ok(())
}
