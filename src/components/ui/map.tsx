import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

// Fix for default marker icon
import { Device, Readings } from "@/models/sensor";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const getAirQualityStatus = (pm25: number) => {
  if (pm25 <= 12) return "bg-green-400";
  if (pm25 <= 35.4) return "bg-yellow-400";
  if (pm25 <= 55.4) color: return "bg-orange-400";

  return "bg-red-400";
};

const redIcon = (num: number) => {
  const colour = getAirQualityStatus(num);

  return L.divIcon({
    className: "custom-icon",
    html: `<div class="${colour} rounded-full w-8 h-8 flex items-center justify-center text-sm">${num}</div>`,
    iconSize: [50, 50],
  });
};

L.Marker.prototype.options.icon = DefaultIcon;

export const Map = ({
  readings,
  devices,
}: {
  readings: Map<string, Readings>;
  devices: Map<string, Device>;
}) => {
  const center: [number, number] = [4.176744, 73.510136];

  return (
    <MapContainer
      center={center}
      zoom={25}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {Array.from(devices.entries()).map(([deviceId, device]) => {
        const reading = readings.get(deviceId);

        return (
          <Marker
            position={[device.long, device.lat]}
            icon={redIcon(reading?.pm_25 ?? 0)}
            key={deviceId}
          ></Marker>
        );
      })}
    </MapContainer>
  );
};

export default Map;
