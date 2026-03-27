use thiserror::Error;

/// Errors from the persistence layer (queries and domain rules tied to storage).
#[derive(Debug, Error)]
pub enum DbError {
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error("Failed to generate a unique email after {0} attempts.")]
    FailedToFindUniqueAddress(usize),
}
