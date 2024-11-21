use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::Duration,
};

use axum::{
    http::Method,
    routing::{any, get},
    Extension, Router,
};
use chrono::Local;
use common::Backend;
use models::{ESPActiveEvent, ESPRecievedEvent, SessionType};
use tokio::{
    net::TcpListener,
    sync::mpsc::{channel, Sender},
};
use tower_http::{
    cors::CorsLayer,
    trace::{self, TraceLayer},
};
use tracing::Level;
use tracing_subscriber::layer::SubscriberExt;

mod error;
mod models;
mod process_esp;
mod routes;
mod session_ws;

const ESP_PORT: u16 = 2442;
const WS_PORT: u16 = 2443;

#[tokio::main]
async fn main() {
    let subscriber = tracing_subscriber::registry().with(tracing_subscriber::fmt::layer());

    tracing::subscriber::set_global_default(subscriber).unwrap();

    let esp_listener = TcpListener::bind(("0.0.0.0", ESP_PORT)).await.unwrap();
    tracing::info!("Initialized ESP listener at port {ESP_PORT}");

    let ws_listener = TcpListener::bind(("0.0.0.0", WS_PORT)).await.unwrap();
    tracing::info!("Initialized WS listener at port {WS_PORT}");

    let sessions = Arc::new(Mutex::new(HashMap::<
        u64,
        (
            SessionType,
            (Sender<ESPRecievedEvent>, Sender<ESPActiveEvent>),
        ),
    >::new()));

    let backend = Backend::new().await;

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_origin([
            "https://aaair.yoon.dev".parse().unwrap(),
            "http://localhost:3000".parse().unwrap(),
        ]);

    let router = Router::new()
        .route("/ws", any(session_ws::handler))
        .route("/", get(routes::root))
        .route(
            "/devices_last_reading",
            get(routes::get_devices_last_reading),
        )
        .route("/devices", get(routes::get_devices))
        .route("/devices/:id", get(routes::get_device))
        .route(
            "/devices/:id/readings",
            get(routes::get_device_last_reading),
        )
        .layer(Extension(backend.clone()))
        .layer(Extension(sessions.clone()))
        .layer(cors)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(trace::DefaultMakeSpan::new().level(Level::INFO))
                .on_response(trace::DefaultOnResponse::new().level(Level::INFO)),
        );

    // ESP HANDLING

    let (tx, mut rx) = channel::<ESPRecievedEvent>(1);

    let backend0 = backend.clone();

    tokio::spawn(async move {
        loop {
            let backend = backend0.clone();

            let (socket, addr) = match esp_listener.accept().await {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("Failed accepting esp connection: {:?}", e);
                    continue;
                }
            };

            tracing::info!("ESP socket connected");

            let tx = tx.clone();

            tokio::spawn(async move {
                match process_esp::process(&backend, addr, socket, tx).await {
                    Ok(_) => (),
                    Err(e) => {
                        tracing::error!("Failed processing ESP data: {:?}", e);
                    }
                };
            });
        }
    });

    // SESSION HANDLING
    // SENDING ESP DATA TO ALL OF THE SESSIONS

    let sessions0 = sessions.clone();

    tokio::spawn(async move {
        loop {
            while let Some(event) = &rx.recv().await {
                for (session_type, (tx, _)) in sessions0.lock().unwrap().values() {
                    tracing::info!("Sending event to connected sessions");

                    match session_type {
                        SessionType::Child(id) => {
                            if id == &event.id {
                                tx.try_send(event.clone()).ok();
                            }
                        }
                        SessionType::Main => {
                            tx.try_send(event.clone()).ok();
                        }
                    };
                }
            }
        }
    });

    let sessions0 = sessions.clone();

    tokio::spawn(async move {
        loop {
            let backend = backend.clone();

            let mut conn = match backend.get_connection().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to get connection: {:?}", e);
                    tokio::time::sleep(Duration::from_secs(10)).await;
                    continue;
                }
            };

            let records = match backend.get_devices_last_records_time(&mut conn).await {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("Failed to checking active: {:?}", e);
                    tokio::time::sleep(Duration::from_secs(10)).await;
                    continue;
                }
            };

            for (d_id, last_updated) in records {
                let diff = Local::now().signed_duration_since(last_updated);

                let active = diff < chrono::Duration::seconds(10);

                let current_status = match backend.get_device_active_status(&mut conn, &d_id).await
                {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::error!("Failed to check active status of device: {d_id}: {:?}", e);
                        continue;
                    }
                };

                if active == current_status {
                    continue;
                }

                if let Err(_) = backend.change_device_active(&mut conn, &d_id, active).await {
                    tracing::error!("Failed to change the active status of device: {d_id}");
                };

                tracing::info!(
                    "Device '{d_id}' status has been changed to {}",
                    if active { "Online" } else { "Offline" }
                );

                for (session_type, (_, tx)) in sessions0.lock().unwrap().values() {
                    handle_active(session_type, &d_id, tx, active);
                }
            }

            drop(conn);

            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });

    axum::serve(
        ws_listener,
        router.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}

fn send_active_event(tx: &Sender<ESPActiveEvent>, id: &str, active: bool) {
    if let Err(why) = tx.try_send(ESPActiveEvent {
        id: id.to_string(),
        active,
    }) {
        tracing::error!("Error sending active event: {}", why);
    }
}

fn handle_active(
    session_type: &SessionType,
    d_id: &str,
    tx: &Sender<ESPActiveEvent>,
    active: bool,
) {
    match session_type {
        SessionType::Child(id) if id == d_id => send_active_event(tx, id, active),
        SessionType::Main => send_active_event(tx, d_id, active),
        _ => (),
    }
}
