use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use common::{records::LastReading, Backend};
use serde::Deserialize;
use serde_json::json;

macro_rules! success {
    ($dfn:expr, $msg:expr) => {
        match $dfn {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("An error has occured: {}, {:?}", $msg, e);

                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "message": $msg })),
                );
            }
        }
    };
}

#[derive(Debug, Deserialize)]
pub struct LastReadingSelect {
    select: LastReading,
}

pub async fn root() -> &'static str {
    "Hello, World!"
}

pub async fn get_devices(backend: Extension<Backend>) -> impl IntoResponse {
    let mut conn = success!(backend.get_connection().await, "Failed to get connection");

    let data = success!(
        backend.list_devices(&mut conn).await,
        "Failed to get devices"
    );

    (
        StatusCode::OK,
        Json(json!({ "success": true, "data": data })),
    )
}

pub async fn get_device(backend: Extension<Backend>, Path(id): Path<String>) -> impl IntoResponse {
    let mut conn = success!(backend.get_connection().await, "Failed getting connection");

    let data = success!(
        backend.get_device(&mut conn, &id).await,
        "Failed getting device"
    );

    (
        StatusCode::OK,
        Json(json!({ "success": true, "data": data})),
    )
}

pub async fn get_device_last_reading(
    backend: Extension<Backend>,
    Path(id): Path<String>,
    Query(q): Query<LastReadingSelect>,
) -> impl IntoResponse {
    let mut conn = success!(backend.get_connection().await, "Failed getting connection");

    if q.select == LastReading::Last {
        let last_reading = success!(
            backend.get_device_last_record(&mut conn, &id).await,
            "Failed getting last record"
        );

        return (
            StatusCode::OK,
            Json(json!({ "success": true, "data": last_reading })),
        );
    }

    let data = success!(
        backend.get_device_records(&mut conn, q.select, &id).await,
        "Failed to get records"
    );

    (
        StatusCode::OK,
        Json(json!({ "success": true, "data": data })),
    )
}

pub async fn get_devices_last_reading(backend: Extension<Backend>) -> impl IntoResponse {
    let mut conn = success!(backend.get_connection().await, "Failed getting connection");

    let data = success!(
        backend.get_devices_last_records(&mut conn).await,
        "Failed getting records"
    );

    (
        StatusCode::OK,
        Json(json!({ "success": true, "data": data })),
    )
}
