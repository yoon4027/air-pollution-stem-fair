use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::Duration,
};

use axum::{
    extract::{
        ws::{Message, WebSocket},
        ConnectInfo, WebSocketUpgrade,
    },
    response::IntoResponse,
    Extension,
};
use common::Backend;
use futures::{future, SinkExt, StreamExt, TryStreamExt};
use tokio::sync::mpsc::{channel, Sender};

use crate::{
    error::XError,
    models::{ESPActiveEvent, ESPRecievedEvent, SessionType, WsMessage},
};

enum EventType {
    Data(ESPRecievedEvent),
    Active(ESPActiveEvent),
}

pub async fn handler(
    ws: WebSocketUpgrade,
    backend: Extension<Backend>,
    sessions: Extension<
        Arc<
            Mutex<
                HashMap<
                    u64,
                    (
                        SessionType,
                        (Sender<ESPRecievedEvent>, Sender<ESPActiveEvent>),
                    ),
                >,
            >,
        >,
    >,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
    tracing::info!("Session connected");

    ws.on_upgrade(move |socket| handle_socket(socket, sessions, backend, addr))
}

pub async fn handle_socket(
    socket: WebSocket,
    sessions: Extension<
        Arc<
            Mutex<
                HashMap<
                    u64,
                    (
                        SessionType,
                        (Sender<ESPRecievedEvent>, Sender<ESPActiveEvent>),
                    ),
                >,
            >,
        >,
    >,
    backend: Extension<Backend>,
    addr: SocketAddr,
) {
    loop {
        let session_id = rand::random();

        let (tx, mut rx) = channel::<ESPRecievedEvent>(1);
        let (tx2, mut rx2) = channel::<ESPActiveEvent>(2);

        let mut interval = tokio::time::interval(Duration::from_secs(5));

        interval.tick().await;

        let mut stream = socket
            .and_then(|x| {
                future::ok(serde_json::from_slice::<WsMessage>(
                    x.into_data().as_slice(),
                ))
            })
            .map::<Result<_, XError>, _>(|x| {
                x.map_err(|e| XError::Axum(e))
                    .and_then(|x| x.map_err(|e| XError::Serde(e)))
            })
            .with::<WsMessage, _, _, _>(|x| {
                future::ok::<_, XError>({
                    let json = serde_json::to_string(&x).unwrap();

                    Message::Text(json)
                })
            });

        let msg = match stream
            .next()
            .await
            .ok_or(XError::ConnectionBroken)
            .and_then(|v| v)
        {
            Ok(n) => n,
            Err(e) => {
                tracing::error!("Failed to read message from stream: {:?}", e);
                return;
            }
        };

        let session_type = match msg {
            WsMessage::Identify(v) => v,
            _ => {
                tracing::error!("Unexpected message/type");
                return;
            }
        };

        // Validation

        if let SessionType::Child(id) = &session_type {
            let mut conn = match backend.get_connection().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to get connection: {:?}", e);
                    return;
                }
            };

            match backend.check_device_exists(&mut conn, &id).await {
                Ok(c) => {
                    if !c {
                        tracing::error!("Device with the id of '{id}' does not exist.");
                        return;
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to check device validity: {:?}", e);
                    return;
                }
            }
        }

        sessions
            .lock()
            .unwrap()
            .insert(session_id, (session_type, (tx, tx2)));

        loop {
            let event = tokio::select! {
                _ = interval.tick() => {
                    match stream.send(WsMessage::KeepAlive).await {
                        Ok(_) => {}
                        Err(e) => {
                            tracing::warn!("[{}] Lost connection: {:?}", addr, e);
                            sessions.lock().unwrap().remove(&session_id);
                            return;
                        }
                    };
                    continue;
                },
                v1 = rx.recv() => match v1 {
                    Some(msg) => EventType::Data(msg),
                    None => {
                        tracing::warn!("[{}] RX closed", addr);
                        sessions.lock().unwrap().remove(&session_id);
                        return;
                    }
                },
                v2 = rx2.recv() => match v2 {
                    Some(msg) => EventType::Active(msg),
                    None => {
                        tracing::warn!("[{}] RX2 closed", addr);
                        sessions.lock().unwrap().remove(&session_id);
                        return;
                    }
                }
            };

            match event {
                EventType::Data(msg) => match stream.send(WsMessage::Data(msg)).await {
                    Ok(_) => {}
                    Err(e) => {
                        tracing::warn!("[{}] Lost connection: {:?}", addr, e);
                        sessions.lock().unwrap().remove(&session_id);
                        return;
                    }
                },
                EventType::Active(msg) => match stream.send(WsMessage::DeviceActive(msg)).await {
                    Ok(_) => {}
                    Err(e) => {
                        tracing::warn!("[{}] Lost connection: {:?}", addr, e);
                        sessions.lock().unwrap().remove(&session_id);
                        return;
                    }
                },
            }
        }
    }
}
