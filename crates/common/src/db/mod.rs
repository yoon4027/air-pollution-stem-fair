pub mod schema;

use diesel_async::{
    pooled_connection::{bb8::Pool, AsyncDieselConnectionManager},
    AsyncPgConnection,
};

pub async fn establish_connection() -> Pool<AsyncPgConnection> {
    dotenvy::dotenv().unwrap();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let config = AsyncDieselConnectionManager::<AsyncPgConnection>::new(&database_url);

    Pool::builder()
        .build(config)
        .await
        .expect(&format!("Error connecting to {}", database_url))
}
