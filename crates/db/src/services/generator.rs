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

fn sanitize(username: String) -> String {
    // Lowercase the string and then filter out any characters that are not
    // alphanumeric. This ensures the username is clean before use.
    username
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
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
