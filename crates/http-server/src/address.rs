use rand::{distributions::Alphanumeric, Rng};

/// Local part: up to 5 alphanumeric chars from `username` (or random if missing/empty) + 3 random alphanumeric.
pub fn generate_local_part(username: Option<&str>) -> String {
    let mut rng = rand::thread_rng();
    let prefix: String = username
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| {
            s.chars()
                .filter(|c| c.is_ascii_alphanumeric())
                .take(5)
                .collect::<String>()
                .to_lowercase()
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            (&mut rng)
                .sample_iter(&Alphanumeric)
                .take(5)
                .map(char::from)
                .collect::<String>()
                .to_lowercase()
        });

    let suffix: String = (&mut rng)
        .sample_iter(&Alphanumeric)
        .take(3)
        .map(char::from)
        .collect::<String>()
        .to_lowercase();

    format!("{prefix}{suffix}")
}

pub fn full_address(local_part: &str, domain: &str) -> String {
    format!("{local_part}@{domain}")
}
