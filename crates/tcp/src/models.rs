use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ESPRecievedEvent {
    pub id: String,
    pub data: PmValues,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ESPActiveEvent {
    pub id: String,
    pub active: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct PmValues {
    pub co: f32,
    pub co2: f32,
    pub temperature: f32,
    pub humidity: f32,
    pub noise: f32,
    pub pm_10: f32,
    pub pm_25: f32,
    pub pm_100: f32,
    pub pm_particles_03: f32,
    pub pm_particles_05: f32,
    pub pm_particles_10: f32,
    pub pm_particles_25: f32,
    pub pm_particles_50: f32,
    pub pm_particles_100: f32,
}

impl From<[f32; 14]> for PmValues {
    fn from(value: [f32; 14]) -> Self {
        Self {
            co: value[0],
            co2: value[1],
            temperature: value[2],
            humidity: value[3],
            noise: value[4],
            pm_10: value[5],
            pm_25: value[6],
            pm_100: value[7],
            pm_particles_03: value[8],
            pm_particles_05: value[9],
            pm_particles_10: value[10],
            pm_particles_25: value[11],
            pm_particles_50: value[12],
            pm_particles_100: value[13],
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
pub enum WsMessage {
    Identify(SessionType),
    Data(ESPRecievedEvent),
    DeviceActive(ESPActiveEvent),
    KeepAlive,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case", tag = "type", content = "id")]
pub enum SessionType {
    Main,
    Child(String),
}

#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
pub enum LastReading {
    Last,
    #[serde(rename = "24H")]
    Hours24,
    #[serde(rename = "7D")]
    Days7,
}
