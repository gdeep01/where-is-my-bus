import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Bus, BusLocation } from "@/lib/supabase";

// Fix default icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom bus icon
const createBusIcon = (isActive: boolean) => {
  const color = isActive ? "#10b981" : "#6b7280";
  return L.divIcon({
    className: "custom-bus-icon",
    html: `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8 2 4 2.5 4 6V16C4 17.1 4.9 18 6 18L5 19V20H7V19H17V20H19V19L18 18C19.1 18 20 17.1 20 16V6C20 2.5 16 2 12 2ZM7.5 17C6.67 17 6 16.33 6 15.5C6 14.67 6.67 14 7.5 14C8.33 14 9 14.67 9 15.5C9 16.33 8.33 17 7.5 17ZM11 10H6V6H11V10ZM13 10V6H18V10H13ZM16.5 17C15.67 17 15 16.33 15 15.5C15 14.67 15.67 14 16.5 14C17.33 14 18 14.67 18 15.5C18 16.33 17.33 17 16.5 17Z"/>
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface BusMapProps {
  bus: Bus | null;
  location: BusLocation | null;
  className?: string;
  height?: string;
  showControls?: boolean;
}

const BusMap: React.FC<BusMapProps> = ({
  bus,
  location,
  className = "",
  height = "600px",
  showControls = true,
}) => {
  const [autoCenter, setAutoCenter] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (mapRef.current && location && autoCenter) {
      const center: [number, number] = [Number(location.latitude), Number(location.longitude)];
      mapRef.current.flyTo(center, mapRef.current.getZoom(), {
        duration: 1,
      });
    }
  }, [location, autoCenter]);

  if (!location || !bus) {
    return (
      <Card className={`${className} p-8`}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">
            {!bus ? "Select a bus to view on map" : "Loading bus location..."}
          </p>
        </div>
      </Card>
    );
  }

  const center: [number, number] = [Number(location.latitude), Number(location.longitude)];
  const isActive = bus.status === "active";
  const lastUpdate = location.timestamp
    ? new Date(location.timestamp).toLocaleTimeString()
    : "Unknown";
  const speed = location.speed ? `${location.speed.toFixed(1)} km/h` : "N/A";

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height, width: "100%", borderRadius: "8px" }}
        className="z-0"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} icon={createBusIcon(isActive)}>
          <Popup>
            <div className="p-2">
              <h3 className="font-bold mb-1">Bus {bus.bus_number}</h3>
              <p className="text-sm">Status: {bus.status}</p>
              <p className="text-sm">Route: {bus.route_name || "N/A"}</p>
              {bus.from_destination && bus.to_destination && (
                <p className="text-sm">
                  {bus.from_destination} → {bus.to_destination}
                </p>
              )}
              <p className="text-sm">Speed: {speed}</p>
              <p className="text-sm text-muted-foreground">
                Last update: {lastUpdate}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {showControls && (
        <div className="absolute top-4 right-4 z-[1000] space-y-2">
          <Button
            variant={autoCenter ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoCenter(!autoCenter)}
          >
            Auto Center: {autoCenter ? "ON" : "OFF"}
          </Button>
          {location && (
            <Card className="p-2 text-xs">
              <p>Last Update: {lastUpdate}</p>
              <p>Speed: {speed}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default BusMap;
