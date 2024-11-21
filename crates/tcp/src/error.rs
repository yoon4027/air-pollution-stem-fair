use thiserror::Error;

#[derive(Debug, Error)]
pub enum XError {
    #[error("db error has occured")]
    DB(String),
    #[error("failed parsing")]
    Axum(axum::Error),
    #[error("serde")]
    Serde(serde_json::Error),
    #[error("connection broken")]
    ConnectionBroken,
}


pub type XResult<T> = Result<T, XError>;

impl std::convert::From<axum::Error> for XError {
    fn from(value: axum::Error) -> Self {
        Self::Axum(value)
    }
}