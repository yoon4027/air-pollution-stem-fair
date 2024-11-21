use diesel::{dsl::exists, result::Error, ExpressionMethods, QueryDsl};
use diesel_async::AsyncPgConnection;
use diesel_async::{
    pooled_connection::bb8::PooledConnection, scoped_futures::ScopedFutureExt, RunQueryDsl,
};
use serde::Serialize;

use super::db::schema::devices;
use super::Backend;
use nanoid::nanoid;

#[derive(Debug, Serialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    #[serde(rename = "box")]
    pub box_: String,

    pub lat: f32,
    pub long: f32,

    pub active: bool,
}

impl Backend {
    pub async fn create_device(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
        name: String,
        box_: String,
        long: f32,
        lat: f32,
    ) -> Result<String, Error> {
        let id = nanoid!(15);
        let id0 = id.clone();

        let long = long.clone();
        let lat = lat.clone();

        connection
            .build_transaction()
            .run(|conn| {
                async move {
                    diesel::insert_into(devices::table)
                        .values((
                            devices::id.eq(id0),
                            devices::name.eq(name),
                            devices::box_.eq(box_),
                            devices::long.eq(long),
                            devices::lat.eq(lat),
                            devices::active.eq(true),
                        ))
                        .execute(conn)
                        .await?;

                    Result::<(), Error>::Ok(())
                }
                .scope_boxed()
            })
            .await?;

        Ok(id)
    }

    pub async fn list_devices(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
    ) -> Result<Vec<Device>, Error> {
        let data = devices::table
            .get_results::<(String, String, String, f32, f32, bool)>(connection)
            .await?;

        Ok(data
            .into_iter()
            .map(|(id, name, box_, lat, long, active)| Device {
                id,
                name,
                box_,
                lat,
                long,
                active,
            })
            .collect())
    }

    pub async fn check_device_exists(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
        id: &str,
    ) -> Result<bool, Error> {
        Ok(
            diesel::select(exists(devices::table.filter(devices::id.eq(id))))
                .get_result::<bool>(connection)
                .await?,
        )
    }

    pub async fn get_device(
        &self,
        connection: &mut PooledConnection<'static, AsyncPgConnection>,
        id: &str,
    ) -> Result<Device, Error> {
        let (id, name, box_, lat, long, active) = devices::table
            .filter(devices::id.eq(id))
            .get_result::<(String, String, String, f32, f32, bool)>(connection)
            .await?;

        Ok(Device {
            id,
            name,
            box_,
            lat,
            long,
            active,
        })
    }

    pub async fn change_device_active(
        &self,
        connection: &mut AsyncPgConnection,
        id: &str,
        active: bool,
    ) -> Result<(), Error> {
        diesel::update(devices::table.filter(devices::id.eq(id)))
            .set(devices::active.eq(active))
            .execute(connection)
            .await?;

        Ok(())
    }

    pub async fn get_device_active_status(
        &self,
        connection: &mut AsyncPgConnection,
        id: &str,
    ) -> Result<bool, Error> {
        Ok(devices::table
            .filter(devices::id.eq(id))
            .select(devices::active)
            .get_result::<bool>(connection)
            .await?)
    }
}
