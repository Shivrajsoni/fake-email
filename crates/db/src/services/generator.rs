use rand::Rng;

fn random_string(length: usize) -> String {
    const CHARSET: &str = "abcdefghjkmnpqrstuvwxyz23456789";
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET.as_bytes()[idx] as char
        })
        .collect()
}

fn sanitize(username: String) -> String {
    username
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect()
}

pub fn generate_email_address(username: Option<String>, domain: &str) -> String {
    let local_part = match username {
        Some(name) => sanitize(name),
        None => random_string(8),
    };
    format!("{}@{}", local_part, domain)
}
