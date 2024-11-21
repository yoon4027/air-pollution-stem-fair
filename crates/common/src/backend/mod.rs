use diesel_async::{
    pooled_connection::bb8::{Pool, PooledConnection, RunError},
    AsyncPgConnection,
};

use crate::db;

mod device;
pub mod records;

#[derive(Debug, Clone)]
pub struct Backend {
    db: Pool<AsyncPgConnection>,
}

impl Backend {
    pub async fn new() -> Self {
        Self {
            db: db::establish_connection().await,
        }
    }

    pub async fn get_connection(
        &self,
    ) -> Result<PooledConnection<'static, AsyncPgConnection>, RunError> {
        Ok(self.db.get_owned().await?)
    }
}
