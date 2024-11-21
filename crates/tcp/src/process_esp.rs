use std::{net::SocketAddr, time::Duration};

use common::Backend;
use tokio::{io::AsyncReadExt, net::TcpStream, sync::mpsc::Sender, time::timeout};

use crate::{
    error::{XError, XResult},
    models::{ESPRecievedEvent, PmValues},
};

pub async fn process(
    backend: &Backend,
    addr: SocketAddr,
    mut socket: TcpStream,
    tx: Sender<ESPRecievedEvent>,
) -> XResult<()> {
    let mut msg = String::new();

    match timeout(Duration::from_secs(5), socket.read_to_string(&mut msg)).await {
        Ok(n) => match n {
            Ok(_) => {}
            Err(e) => {
                tracing::error!(
                    "[{}] Error while reading message from client: {:?}",
                    addr,
                    e
                );
                return Ok(());
            }
        },
        Err(_) => {
            tracing::error!("[{}] Timed out while reading message from client", addr);
            return Ok(());
        }
    };

    let data = msg.trim().split(";").collect::<Vec<_>>();

    if data.len() != 15 {
        tracing::error!(
            "[{}] Expected 15 components. Found {}. Message got: {}",
            addr,
            data.len(),
            msg
        );

        return Ok(());
    }

    let device_id = data[0];

    let mut conn = backend
        .get_connection()
        .await
        .map_err(|e| XError::DB(e.to_string()))?;

    if !backend
        .check_device_exists(&mut conn, device_id)
        .await
        .map_err(|e| XError::DB(e.to_string()))?
    {
        tracing::error!("[{}] Invalid device ID: {}", addr, device_id);
        return Ok(());
    }

    let values: [f32; 14] = data[1..]
        .iter()
        .map(|x| x.parse::<f32>().unwrap_or_else(|_| f32::NAN))
        .collect::<Vec<_>>()
        .try_into()
        .unwrap();

    let values0 = values.clone();

    let values: PmValues = values.into();

    if let Err(why) = tx
        .send(ESPRecievedEvent {
            id: device_id.to_string(),
            data: values.clone(),
        })
        .await
    {
        tracing::error!("Failed to send values to thread: {}", why.to_string());
    };

    if let Err(why) = backend
        .create_record(&mut conn, device_id.to_string(), values0)
        .await
    {
        tracing::error!("Error while creating a record: {:?}", why);
    };

    Ok(())
}
