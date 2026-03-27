//! SMTP wire protocol helpers (DATA dot-stuffing, command parsing, domain checks).

use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::TcpStream;
use tokio::time::timeout;

/// Reads SMTP DATA until a line containing only `.` (after dot-unstuffing per RFC 5321 §4.5.2).
pub async fn read_smtp_data(
    reader: &mut BufReader<TcpStream>,
    max_bytes: usize,
    read_timeout: Duration,
) -> Result<Vec<u8>, DataReadError> {
    let mut message = Vec::new();
    let mut line = Vec::<u8>::new();

    loop {
        line.clear();
        let n = timeout(read_timeout, reader.read_until(b'\n', &mut line))
            .await
            .map_err(|_| DataReadError::Timeout)??;

        if n == 0 {
            return Err(DataReadError::UnexpectedEof);
        }

        let trimmed = trim_trailing_crlf(&line);
        if trimmed == b"." {
            break;
        }

        let payload = if trimmed.first() == Some(&b'.') {
            &trimmed[1..]
        } else {
            trimmed
        };

        let add = payload.len().saturating_add(2);
        if message.len().saturating_add(add) > max_bytes {
            return Err(DataReadError::MessageTooLarge);
        }

        message.extend_from_slice(payload);
        message.extend_from_slice(b"\r\n");
    }

    Ok(message)
}

#[derive(Debug)]
pub enum DataReadError {
    Io(std::io::Error),
    UnexpectedEof,
    MessageTooLarge,
    Timeout,
}

impl From<std::io::Error> for DataReadError {
    fn from(e: std::io::Error) -> Self {
        DataReadError::Io(e)
    }
}

fn trim_trailing_crlf(line: &[u8]) -> &[u8] {
    let mut end = line.len();
    if end > 0 && line[end - 1] == b'\n' {
        end -= 1;
    }
    if end > 0 && line[end - 1] == b'\r' {
        end -= 1;
    }
    &line[..end]
}

/// Normalizes SMTP path `<addr>` or `addr` for storage (max 255 bytes for DB).
pub fn normalize_mail_from_path(path: &str) -> String {
    let mut s = path.trim().to_string();
    if s.starts_with('<') && s.ends_with('>') && s.len() >= 2 {
        s = s[1..s.len() - 1].to_string();
    }
    if s.is_empty() || s == "@" {
        return "unknown".to_string();
    }
    truncate_bytes(&s, 255)
}

fn truncate_bytes(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    let mut out = String::new();
    for ch in s.chars() {
        let next = format!("{out}{ch}");
        if next.len() > max_bytes {
            break;
        }
        out = next;
    }
    out
}

/// Returns the domain part of `local@domain`, ASCII-lowercased.
pub fn domain_of_recipient(recipient: &str) -> Option<String> {
    let s = recipient.trim();
    let inner = if s.starts_with('<') && s.ends_with('>') && s.len() >= 2 {
        &s[1..s.len() - 1]
    } else {
        s
    };
    let (_, domain) = inner.rsplit_once('@')?;
    if domain.is_empty() {
        return None;
    }
    Some(domain.to_ascii_lowercase())
}

pub fn domain_matches(recipient_domain: &str, our_domain: &str) -> bool {
    recipient_domain.eq(&our_domain.to_ascii_lowercase())
}

/// Parses `MAIL FROM:<x> SIZE=12345` (SIZE is optional, case-insensitive).
pub fn parse_mail_from_command(command: &str) -> (String, Option<u64>) {
    let upper = command.to_ascii_uppercase();
    let rest = if let Some(i) = upper.find("MAIL FROM:") {
        command[i + "MAIL FROM:".len()..].trim()
    } else if let Some(i) = upper.find("MAIL FROM") {
        command[i + "MAIL FROM".len()..].trim()
    } else {
        ""
    };

    let mut declared_size = None::<u64>;
    let tokens: Vec<&str> = rest.split_whitespace().collect();
    if tokens.is_empty() {
        return (String::new(), None);
    }

    let path_part = tokens[0];
    for t in tokens.iter().skip(1) {
        let tu = t.to_ascii_uppercase();
        if let Some(num) = tu.strip_prefix("SIZE=") {
            declared_size = num.parse().ok();
        }
    }

    (normalize_mail_from_path(path_part), declared_size)
}

/// Extracts `<path>` or first token from `RCPT TO:<...>`.
pub fn parse_rcpt_to_command(command: &str) -> String {
    let upper = command.to_ascii_uppercase();
    let rest = if let Some(i) = upper.find("RCPT TO:") {
        command[i + "RCPT TO:".len()..].trim()
    } else if let Some(i) = upper.find("RCPT TO") {
        command[i + "RCPT TO".len()..].trim()
    } else {
        ""
    };

    if let Some(start) = rest.find('<') {
        if let Some(end) = rest.find('>') {
            return rest[start + 1..end].trim().to_string();
        }
    }
    rest.split_whitespace().next().unwrap_or("").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::AsyncWriteExt;
    use tokio::net::TcpListener;

    #[test]
    fn trim_crlf() {
        assert_eq!(trim_trailing_crlf(b"foo\r\n"), b"foo");
        assert_eq!(trim_trailing_crlf(b".\r\n"), b".");
    }

    #[test]
    fn domain_of() {
        assert_eq!(
            domain_of_recipient("<User@Example.COM>").as_deref(),
            Some("example.com")
        );
    }

    #[test]
    fn mail_from_size() {
        let (from, sz) = parse_mail_from_command("MAIL FROM:<a@b.org> SIZE=9999");
        assert_eq!(from, "a@b.org");
        assert_eq!(sz, Some(9999));
    }

    #[test]
    fn normalize_mail_from_path_strips_brackets_and_unknown() {
        assert_eq!(normalize_mail_from_path("<a@b.org>"), "a@b.org");
        assert_eq!(normalize_mail_from_path("a@b.org"), "a@b.org");
        assert_eq!(normalize_mail_from_path("@"), "unknown");
        assert_eq!(normalize_mail_from_path(""), "unknown");
    }

    #[test]
    fn parse_mail_from_command_size_case_insensitive() {
        let (from, sz) = parse_mail_from_command("MAIL FROM:<a@b.org> sIzE=42");
        assert_eq!(from, "a@b.org");
        assert_eq!(sz, Some(42));
    }

    #[test]
    fn parse_mail_from_command_no_size_returns_none() {
        let (from, sz) = parse_mail_from_command("MAIL FROM:<a@b.org>");
        assert_eq!(from, "a@b.org");
        assert_eq!(sz, None);
    }

    #[test]
    fn parse_rcpt_to_command_extracts_bracketed_address() {
        assert_eq!(
            parse_rcpt_to_command("RCPT TO:<User@Example.COM>"),
            "User@Example.COM".to_string()
        );
    }

    #[test]
    fn parse_rcpt_to_command_fallback_to_first_token() {
        assert_eq!(
            parse_rcpt_to_command("RCPT TO: user@example.com"),
            "user@example.com".to_string()
        );
    }

    #[test]
    fn domain_matches_case_insensitive() {
        // `domain_matches` lowercases only the `our_domain` side; callers should normalize
        // recipient domains first (we do that in the SMTP pipeline).
        assert!(domain_matches("example.com", "example.com"));
        assert!(!domain_matches("other.com", "example.com"));
        assert!(!domain_matches("Example.COM", "example.com"));
    }

    async fn read_with_smtp_lines(
        lines: &[&str],
        max_bytes: usize,
    ) -> Result<Vec<u8>, DataReadError> {
        // `tokio::spawn` requires captured values to be `'static`, so clone the input lines.
        let owned_lines: Vec<String> = lines.iter().map(|s| s.to_string()).collect();

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let client = tokio::spawn(async move {
            let mut stream = tokio::net::TcpStream::connect(addr).await.unwrap();
            for l in owned_lines {
                stream.write_all(l.as_bytes()).await.unwrap();
            }
            // Drop/close so server sees EOF if terminator wasn't sent.
        });

        let (server_stream, _) = listener.accept().await.unwrap();
        let mut reader = BufReader::new(server_stream);
        let out = read_smtp_data(&mut reader, max_bytes, Duration::from_secs(2)).await;
        let _ = client.await;
        out
    }

    #[tokio::test]
    async fn read_smtp_data_dot_unstuffs_lines() {
        // The SMTP DATA section ends with a line containing only ".".
        let lines = &["Hello\r\n", ".StartsWithDot\r\n", ".\r\n"];
        let out = read_with_smtp_lines(lines, 1024).await.unwrap();
        assert_eq!(out, b"Hello\r\nStartsWithDot\r\n".to_vec());
    }

    #[tokio::test]
    async fn read_smtp_data_message_too_large() {
        // Payload "AAAA" (4 bytes) => plus "\r\n" (2 bytes) => add=6.
        // max_bytes=5 should trigger MessageTooLarge.
        let lines = &["AAAA\r\n", ".\r\n"];
        let err = read_with_smtp_lines(lines, 5).await.unwrap_err();
        matches!(err, DataReadError::MessageTooLarge);
    }

    #[tokio::test]
    async fn read_smtp_data_unexpected_eof_without_terminator() {
        // No terminating ".\r\n" => server eventually sees EOF.
        let lines = &["Hello\r\n"];
        let err = read_with_smtp_lines(lines, 1024).await.unwrap_err();
        matches!(err, DataReadError::UnexpectedEof);
    }

    #[tokio::test]
    async fn read_smtp_data_timeout_when_no_data_sent() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let client = tokio::spawn(async move {
            let _stream = tokio::net::TcpStream::connect(addr).await.unwrap();
            // Keep connection open but don't send anything.
            tokio::time::sleep(Duration::from_millis(200)).await;
        });

        let (server_stream, _) = listener.accept().await.unwrap();
        let mut reader = BufReader::new(server_stream);
        let err = read_smtp_data(&mut reader, 1024, Duration::from_millis(50))
            .await
            .unwrap_err();

        let _ = client.await;
        matches!(err, DataReadError::Timeout);
    }
}
