-- Your SQL goes here

CREATE TABLE devices (
    id            VARCHAR(25)       NOT NULL PRIMARY KEY,
    name          VARCHAR(255)      NOT NULL,
    box           VARCHAR(100)      NOT NULL,

    lat            REAL             NOT NULL,
    long           REAL             NOT NULL,

    active         BOOLEAN          NOT NULL
);

CREATE TABLE hour_records (
    id                          SERIAL                      NOT NULL PRIMARY KEY,
    fk_device_id                VARCHAR(255)                NOT NULL,

    co                          REAL                        NOT NULL,
    co2                         REAL                        NOT NULL,

    noise                       REAL                        NOT NULL,
    temperature                 REAL                        NOT NULL,
    humidity                    REAL                        NOT NULL,

    pm_10                      REAL                        NOT NULL,
    pm_25                       REAL                        NOT NULL,
    pm_100                      REAL                        NOT NULL,

    pm_particles_03             REAL                        NOT NULL,
    pm_particles_05             REAL                        NOT NULL,
    pm_particles_10             REAL                        NOT NULL,
    pm_particles_25             REAL                        NOT NULL,
    pm_particles_50             REAL                        NOT NULL,
    pm_particles_100            REAL                        NOT NULL,

    created_at                  TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    FOREIGN KEY (fk_device_id)  REFERENCES devices (id)
);


CREATE TABLE last_record (
    fk_device_id VARCHAR(255)                    NOT NULL PRIMARY KEY,

    co                          REAL                        NOT NULL,
    co2                         REAL                        NOT NULL,

    noise                       REAL                        NOT NULL,
    temperature                 REAL                        NOT NULL,
    humidity                    REAL                        NOT NULL,

    pm_10                       REAL                        NOT NULL,
    pm_25                       REAL                        NOT NULL,
    pm_100                      REAL                        NOT NULL,

    pm_particles_03             REAL                        NOT NULL,
    pm_particles_05             REAL                        NOT NULL,
    pm_particles_10             REAL                        NOT NULL,
    pm_particles_25             REAL                        NOT NULL,
    pm_particles_50             REAL                        NOT NULL,
    pm_particles_100            REAL                        NOT NULL,

    updated_at   TIMESTAMP(6)  WITH TIME ZONE    NOT NULL,

    FOREIGN KEY (fk_device_id) REFERENCES devices (id)
);
