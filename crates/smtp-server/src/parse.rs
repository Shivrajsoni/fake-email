//! RFC 5322 / MIME parsing for stored messages.
//!
//! All structured extraction from raw message bytes uses the **`mail-parser`** crate
//! ([`MessageParser`]).
//! SMTP session framing (DATA, dot-stuffing) stays in `crate::rfc5321`.

use mail_parser::MessageParser;
use serde_json::{json, Map};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("mail-parser could not build a message from input")]
    InvalidMessage,
}

/// Fields we persist for each received message (one parse, many mailbox inserts).
#[derive(Debug)]
pub struct ParsedForDb {
    pub from_address: String,
    pub subject: Option<String>,
    pub body_plain: Option<String>,
    pub body_html: Option<String>,
    pub headers: serde_json::Value,
    pub size_bytes: i32,
}

/// Parse raw RFC 5322 bytes using **mail-parser** only.
pub fn parse_inbound_bytes(raw: &[u8], envelope_from: &str) -> Result<ParsedForDb, ParseError> {
    let msg = MessageParser::default()
        .parse(raw)
        .ok_or(ParseError::InvalidMessage)?;

    let from_header = msg
        .from()
        .and_then(|a| a.first())
        .and_then(|addr| addr.address.as_ref())
        .map(|a| truncate_utf8_by_bytes(a.as_ref(), 255))
        .filter(|s| !s.is_empty());

    let envelope = if envelope_from.is_empty() {
        "unknown"
    } else {
        envelope_from
    };
    let from_address = from_header.unwrap_or_else(|| truncate_utf8_by_bytes(envelope, 255));

    let subject = msg
        .subject()
        .map(|s| s.chars().take(500).collect::<String>());

    let body_plain = msg.body_text(0).map(|c| c.into_owned());
    let body_html = msg.body_html(0).map(|c| c.into_owned());

    let mut map = Map::new();
    for (name, value) in msg.headers_raw() {
        map.insert(name.to_ascii_lowercase(), json!(value));
    }

    Ok(ParsedForDb {
        from_address,
        subject,
        body_plain,
        body_html,
        headers: serde_json::Value::Object(map),
        size_bytes: raw.len().min(i32::MAX as usize) as i32,
    })
}

fn truncate_utf8_by_bytes(s: &str, max_bytes: usize) -> String {
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
