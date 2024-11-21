import { Device } from "@/models/sensor";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const pulsingIcon = () => {
  return L.divIcon({
    className: "pulsing-icon", // Use CSS class for styling
    html: `
      <div class="pulse-dot"></div>
      <div class="pulse-ring"></div>
    `,
    iconSize: [50, 50],
  });
};

const singleMap = ({
  device,
  center,
}: {
  device: Device;
  center: [number, number];
}) => {
  return (
    <MapContainer
      center={center}
      zoom={18}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom={false}
      zoomControl={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker
        position={[device.long, device.lat]}
        icon={pulsingIcon()}
        key={device.id}
      ></Marker>
    </MapContainer>
  );
};

export default singleMap;
