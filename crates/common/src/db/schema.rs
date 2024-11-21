// @generated automatically by Diesel CLI.

diesel::table! {
    devices (id) {
        #[max_length = 25]
        id -> Varchar,
        #[max_length = 255]
        name -> Varchar,
        #[sql_name = "box"]
        #[max_length = 100]
        box_ -> Varchar,
        lat -> Float4,
        long -> Float4,
        active -> Bool,
    }
}

diesel::table! {
    hour_records (id) {
        id -> Int4,
        #[max_length = 255]
        fk_device_id -> Varchar,
        co -> Float4,
        co2 -> Float4,
        noise -> Float4,
        temperature -> Float4,
        humidity -> Float4,
        pm_10 -> Float4,
        pm_25 -> Float4,
        pm_100 -> Float4,
        pm_particles_03 -> Float4,
        pm_particles_05 -> Float4,
        pm_particles_10 -> Float4,
        pm_particles_25 -> Float4,
        pm_particles_50 -> Float4,
        pm_particles_100 -> Float4,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    last_record (fk_device_id) {
        #[max_length = 255]
        fk_device_id -> Varchar,
        co -> Float4,
        co2 -> Float4,
        noise -> Float4,
        temperature -> Float4,
        humidity -> Float4,
        pm_10 -> Float4,
        pm_25 -> Float4,
        pm_100 -> Float4,
        pm_particles_03 -> Float4,
        pm_particles_05 -> Float4,
        pm_particles_10 -> Float4,
        pm_particles_25 -> Float4,
        pm_particles_50 -> Float4,
        pm_particles_100 -> Float4,
        updated_at -> Timestamptz,
    }
}

diesel::joinable!(hour_records -> devices (fk_device_id));
diesel::joinable!(last_record -> devices (fk_device_id));

diesel::allow_tables_to_appear_in_same_query!(
    devices,
    hour_records,
    last_record,
);
