/// Rules for a user-chosen local part (before `@`). Must stay aligned with [`crate::services::generator::sanitize`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LocalPartValidationError {
    TooShort,
    TooLong,
    InvalidCharacters,
}

/// Validates optional username for API requests (3–20 chars, alphanumeric + underscore).
pub fn validate_local_part(username: &str) -> Result<(), LocalPartValidationError> {
    if username.len() < 3 {
        return Err(LocalPartValidationError::TooShort);
    }
    if username.len() > 20 {
        return Err(LocalPartValidationError::TooLong);
    }
    if !username
        .chars()
        .all(|c| c.is_alphanumeric() || c == '_')
    {
        return Err(LocalPartValidationError::InvalidCharacters);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_local_part_accepts_boundaries() {
        assert!(validate_local_part("abc").is_ok());
        assert!(validate_local_part("abcdefghijklmnopqrst").is_ok()); // 20 chars
        assert!(validate_local_part("abc_def").is_ok());
    }

    #[test]
    fn validate_local_part_rejects_too_short() {
        assert!(matches!(
            validate_local_part("ab"),
            Err(LocalPartValidationError::TooShort)
        ));
    }

    #[test]
    fn validate_local_part_rejects_too_long() {
        assert!(matches!(
            validate_local_part("abcdefghijklmnopqrstu"), // 21 chars
            Err(LocalPartValidationError::TooLong)
        ));
    }

    #[test]
    fn validate_local_part_rejects_invalid_chars() {
        assert!(matches!(
            validate_local_part("ab-c"),
            Err(LocalPartValidationError::InvalidCharacters)
        ));
        assert!(matches!(
            validate_local_part("ab c"),
            Err(LocalPartValidationError::InvalidCharacters)
        ));
        assert!(matches!(
            validate_local_part("ab$"),
            Err(LocalPartValidationError::InvalidCharacters)
        ));
    }
}
