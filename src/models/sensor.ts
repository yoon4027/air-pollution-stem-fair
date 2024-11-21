export interface Device {
  id: string;
  name: string;
  box: string;
  lat: number;
  long: number;
  active: boolean;
}

export interface Sensor extends Readings {
  id: string;
}

export interface Readings {
  co: number;
  co2: number;
  temperature: number;
  humidity: number;
  noise: number;
  pm_10: number;
  pm_25: number;
  pm_100: number;
  pm_particles_03: number;
  pm_particles_05: number;
  pm_particles_10: number;
  pm_particles_25: number;
  pm_particles_50: number;
  pm_particles_100: number;
}

export interface WsResponse {
  type: string;
  data: {
    id: string;
    data: Sensor;
    active: boolean;
  };
}
