use rand::Rng;

fn random_string(length: usize) -> String {
    // A character set that omits visually similar characters (e.g., 'i', 'l', 'o', '0', '1')
    // to improve readability and reduce user error.
    const CHARSET: &'static str = "abcdefghjkmnpqrstuvwxyz23456789";
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET.as_bytes()[idx] as char
        })
        .collect()
}

/// Normalizes user input for the local part. Keeps rules aligned with [`crate::validation::validate_local_part`].
fn sanitize(username: String) -> String {
    username
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_')
        .collect()
}

pub fn generate_email_address(username: Option<String>, domain: &str) -> String {
    let local_part = match username {
        Some(name) => sanitize(name),
        None => {
            // If no name is provided, just generate a random string.
            random_string(8)
        }
    };

    // Append the '@' and the domain to the generated local_part.
    format!("{}@{}", local_part, domain)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_email_address_with_username_sanitizes_to_lowercase() {
        let addr = generate_email_address(Some("User_Name".to_string()), "example.com");
        assert_eq!(addr, "user_name@example.com");
    }

    #[test]
    fn generate_email_address_without_username_has_expected_format() {
        let domain = "example.com";
        let addr = generate_email_address(None, domain);
        let mut parts = addr.split('@');
        let local = parts.next().unwrap();
        let dom = parts.next().unwrap();
        assert_eq!(parts.next(), None);
        assert_eq!(dom, domain);

        // local part should be exactly 8 chars from the generator charset.
        assert_eq!(local.len(), 8);
        let allowed = "abcdefghjkmnpqrstuvwxyz23456789";
        assert!(local.chars().all(|c| allowed.contains(c)));
    }
}
