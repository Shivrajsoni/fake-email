use thiserror::Error;

#[derive(Debug, Error)]
pub enum ServiceError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Failed to generate a unique email after {0} attempts.")]
    FailedToFindUniqueName(usize),
}
