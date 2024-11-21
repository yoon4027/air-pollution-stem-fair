use chrono::{DateTime, Duration, Local};
use diesel::BoolExpressionMethods;
use diesel::ExpressionMethods;
use diesel::{result::Error, OptionalExtension, QueryDsl};
use diesel_async::AsyncPgConnection;
use diesel_async::{
    pooled_connection::bb8::PooledConnection, scoped_futures::ScopedFutureExt, RunQueryDsl,
};
use serde::{Deserialize, Serialize};

use crate::db::schema::{hour_records, last_record};

use super::Backend;

#[derive(Debug, Serialize)]
pub struct Readings {
    co: f32,
    co2: f32,
    temperature: f32,
    humidity: f32,
    noise: f32,
    pm_10: f32,
    pm_25: f32,
    pm_100: f32,
    pm_particles_03: f32,
    pm_particles_05: f32,
    pm_particles_10: f32,
    pm_particles_25: f32,
    pm_particles_50: f32,
    pm_particles_100: f32,
    created_at: DateTime<Local>,
}

#[derive(Debug, Default, Serialize)]
pub struct Reading {
    co: f32,
    co2: f32,
    noise: f32,
    temperature: f32,
    humidity: f32,
    pm_10: f32,
    pm_25: f32,
    pm_100: f32,
    pm_particles_03: f32,
    pm_particles_05: f32,
    pm_particles_10: f32,
    pm_particles_25: f32,
    pm_particles_50: f32,
    pm_particles_100: f32,
    updated_at: DateTime<Local>,
}

#[derive(Debug, Default, Serialize)]
pub struct DevicesReading {
    id: String,
    co: f32,
    co2: f32,
    temperature: f32,
    humidity: f32,
    noise: f32,
    pm_10: f32,
    pm_25: f32,
    pm_100: f32,
    pm_particles_03: f32,
    pm_particles_05: f32,
    pm_particles_10: f32,
    pm_particles_25: f32,
    pm_particles_50: f32,
    pm_particles_100: f32,
}

type ReadingDateSelect = (
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    f32,
    DateTime<Local>,
);

#[derive(Debug, Deserialize, Eq, PartialEq)]
pub enum LastReading {
    Last,
    #[serde(rename = "24H")]
    Hours24,
    #[serde(rename = "7D")]
    Days7,
}

impl Backend {
    pub async fn create_record(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
        id: String,
        values: [f32; 14],
    ) -> Result<(), Error> {
        connection
            .build_transaction()
            .run(|conn| {
                async move {
                    let now = Local::now();

                    diesel::insert_into(last_record::table)
                        .values((
                            last_record::fk_device_id.eq(&id),
                            last_record::co.eq(values[0]),
                            last_record::co2.eq(values[1]),
                            last_record::temperature.eq(values[2]),
                            last_record::humidity.eq(values[3]),
                            last_record::noise.eq(values[4]),
                            last_record::pm_10.eq(values[5]),
                            last_record::pm_25.eq(values[6]),
                            last_record::pm_100.eq(values[7]),
                            last_record::pm_particles_03.eq(values[8]),
                            last_record::pm_particles_05.eq(values[9]),
                            last_record::pm_particles_10.eq(values[10]),
                            last_record::pm_particles_25.eq(values[11]),
                            last_record::pm_particles_50.eq(values[12]),
                            last_record::pm_particles_100.eq(values[13]),
                            last_record::updated_at.eq(&now),
                        ))
                        .on_conflict(last_record::fk_device_id)
                        .do_update()
                        .set((
                            last_record::fk_device_id.eq(&id),
                            last_record::co.eq(values[0]),
                            last_record::co2.eq(values[1]),
                            last_record::temperature.eq(values[2]),
                            last_record::humidity.eq(values[3]),
                            last_record::noise.eq(values[4]),
                            last_record::pm_10.eq(values[5]),
                            last_record::pm_25.eq(values[6]),
                            last_record::pm_100.eq(values[7]),
                            last_record::pm_particles_03.eq(values[8]),
                            last_record::pm_particles_05.eq(values[9]),
                            last_record::pm_particles_10.eq(values[10]),
                            last_record::pm_particles_25.eq(values[11]),
                            last_record::pm_particles_50.eq(values[12]),
                            last_record::pm_particles_100.eq(values[13]),
                            last_record::updated_at.eq(&now),
                        ))
                        .execute(conn)
                        .await?;

                    self.change_device_active(conn, &id, true).await?;

                    let last_time = hour_records::table
                        .filter(hour_records::fk_device_id.eq(&id))
                        .select(hour_records::created_at)
                        .order_by(hour_records::created_at.desc())
                        .first::<DateTime<Local>>(conn)
                        .await
                        .optional()?;

                    if let Some(time) = last_time {
                        let now = Local::now();

                        if (now.signed_duration_since(time)) <= Duration::minutes(30) {
                            dbg!(now.signed_duration_since(time).num_minutes());

                            return Ok(());
                        }
                    }

                    diesel::insert_into(hour_records::table)
                        .values((
                            hour_records::fk_device_id.eq(&id),
                            hour_records::co.eq(values[0]),
                            hour_records::co2.eq(values[1]),
                            hour_records::temperature.eq(values[2]),
                            hour_records::humidity.eq(values[3]),
                            hour_records::noise.eq(values[4]),
                            hour_records::pm_10.eq(values[5]),
                            hour_records::pm_25.eq(values[6]),
                            hour_records::pm_100.eq(values[7]),
                            hour_records::pm_particles_03.eq(values[8]),
                            hour_records::pm_particles_05.eq(values[9]),
                            hour_records::pm_particles_10.eq(values[10]),
                            hour_records::pm_particles_25.eq(values[11]),
                            hour_records::pm_particles_50.eq(values[12]),
                            hour_records::pm_particles_100.eq(values[13]),
                            hour_records::created_at.eq(Local::now()),
                        ))
                        .execute(conn)
                        .await?;

                    Result::<(), Error>::Ok(())
                }
                .scope_boxed()
            })
            .await
    }

    pub async fn get_device_last_record(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
        id: &str,
    ) -> Result<Reading, Error> {
        let record = last_record::table
            .filter(last_record::fk_device_id.eq(id))
            .select((
                last_record::co,
                last_record::co2,
                last_record::temperature,
                last_record::humidity,
                last_record::noise,
                last_record::pm_10,
                last_record::pm_25,
                last_record::pm_100,
                last_record::pm_particles_03,
                last_record::pm_particles_05,
                last_record::pm_particles_10,
                last_record::pm_particles_25,
                last_record::pm_particles_50,
                last_record::pm_particles_100,
                last_record::updated_at,
            ))
            .get_result::<ReadingDateSelect>(connection)
            .await
            .optional()?;

        Ok(record
            .map(
                |(
                    co,
                    co2,
                    temperature,
                    humidity,
                    noise,
                    pm_10,
                    pm_25,
                    pm_100,
                    pm_particles_03,
                    pm_particles_05,
                    pm_particles_10,
                    pm_particles_25,
                    pm_particles_50,
                    pm_particles_100,
                    updated_at,
                )| {
                    Reading {
                        co,
                        co2,
                        temperature,
                        humidity,
                        noise,

                        pm_10,
                        pm_25,
                        pm_100,

                        pm_particles_03,
                        pm_particles_05,
                        pm_particles_10,
                        pm_particles_25,
                        pm_particles_50,
                        pm_particles_100,

                        updated_at,
                    }
                },
            )
            .unwrap_or_else(|| Reading::default()))
    }

    pub async fn get_device_records(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
        recording: LastReading,
        id: &str,
    ) -> Result<Vec<Readings>, Error> {
        let now = Local::now();

        let now = match recording {
            LastReading::Days7 => now - Duration::days(7),
            LastReading::Hours24 => now - Duration::days(1),
            LastReading::Last => return Err(Error::NotFound),
        };

        let data = hour_records::table
            .filter(
                hour_records::fk_device_id
                    .eq(id)
                    .and(hour_records::created_at.gt(now)),
            )
            .select((
                hour_records::co,
                hour_records::co2,
                hour_records::temperature,
                hour_records::humidity,
                hour_records::noise,
                hour_records::pm_10,
                hour_records::pm_25,
                hour_records::pm_100,
                hour_records::pm_particles_03,
                hour_records::pm_particles_05,
                hour_records::pm_particles_10,
                hour_records::pm_particles_25,
                hour_records::pm_particles_50,
                hour_records::pm_particles_100,
                hour_records::created_at,
            ))
            .get_results::<ReadingDateSelect>(connection)
            .await?;

        Ok(data
            .into_iter()
            .map(
                |(
                    co,
                    co2,
                    temperature,
                    humidity,
                    noise,
                    pm_10,
                    pm_25,
                    pm_100,
                    pm_particles_03,
                    pm_particles_05,
                    pm_particles_10,
                    pm_particles_25,
                    pm_particles_50,
                    pm_particles_100,
                    created_at,
                )| Readings {
                    co,
                    co2,
                    temperature,
                    humidity,
                    noise,
                    pm_10,
                    pm_25,
                    pm_100,
                    pm_particles_03,
                    pm_particles_05,
                    pm_particles_10,
                    pm_particles_25,
                    pm_particles_50,
                    pm_particles_100,
                    created_at,
                },
            )
            .collect())
    }

    pub async fn get_devices_last_records(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
    ) -> Result<Vec<DevicesReading>, Error> {
        let records = last_record::table
            .select((
                last_record::fk_device_id,
                last_record::co,
                last_record::co2,
                last_record::temperature,
                last_record::humidity,
                last_record::noise,
                last_record::pm_10,
                last_record::pm_25,
                last_record::pm_100,
                last_record::pm_particles_03,
                last_record::pm_particles_05,
                last_record::pm_particles_10,
                last_record::pm_particles_25,
                last_record::pm_particles_50,
                last_record::pm_particles_100,
            ))
            .get_results::<(
                String,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
                f32,
            )>(connection)
            .await?;

        Ok(records
            .into_iter()
            .map(
                |(
                    id,
                    co,
                    co2,
                    temperature,
                    humidity,
                    noise,
                    pm_10,
                    pm_25,
                    pm_100,
                    pm_particles_03,
                    pm_particles_05,
                    pm_particles_10,
                    pm_particles_25,
                    pm_particles_50,
                    pm_particles_100,
                )| DevicesReading {
                    id,
                    co,
                    co2,
                    temperature,
                    humidity,
                    noise,
                    pm_10,
                    pm_25,
                    pm_100,
                    pm_particles_03,
                    pm_particles_05,
                    pm_particles_10,
                    pm_particles_25,
                    pm_particles_50,
                    pm_particles_100,
                },
            )
            .collect())
    }

    pub async fn get_devices_last_records_time(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
    ) -> Result<Vec<(String, DateTime<Local>)>, Error> {
        Ok(last_record::table
            .select((last_record::fk_device_id, last_record::updated_at))
            .get_results::<(String, DateTime<Local>)>(connection)
            .await?)
    }
}
