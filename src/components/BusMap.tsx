import React, { useEffect, useRef } from "react";
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
      <div style="background-color: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8 2 4 2.5 4 6V16C4 17.1 4.9 18 6 18L5 19V20H7V19H17V20H19V19L18 18C19.1 18 20 17.1 20 16V6C20 2.5 16 2 12 2ZM7.5 17C6.67 17 6 16.33 6 15.5C6 14.67 6.67 14 7.5 14C8.33 14 9 14.67 9 15.5C9 16.33 8.33 17 7.5 17ZM11 10H6V6H11V10ZM13 10V6H18V10H13ZM16.5 17C15.67 17 15 16.33 15 15.5C15 14.67 15.67 14 16.5 14C17.33 14 18 14.67 18 15.5C18 16.33 17.33 17 16.5 17Z"/>
        </svg>
      </div>
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const autoCenterRef = useRef(true);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([13.9006, 74.9018], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !location || !bus) return;

    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    const position: [number, number] = [lat, lng];
    const isActive = bus.status === "active";

    // Remove existing marker
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
    }

    // Create new marker
    markerRef.current = L.marker(position, { 
      icon: createBusIcon(isActive) 
    }).addTo(mapInstanceRef.current);

    // Add popup
    const lastUpdate = location.timestamp
      ? new Date(location.timestamp).toLocaleTimeString()
      : "Unknown";
    const speed = location.speed ? `${location.speed.toFixed(1)} km/h` : "N/A";

    const popupContent = `
      <div style="padding: 8px;">
        <h3 style="font-weight: bold; margin-bottom: 4px;">Bus ${bus.bus_number}</h3>
        <p style="font-size: 14px; margin: 2px 0;">Status: ${bus.status}</p>
        <p style="font-size: 14px; margin: 2px 0;">Route: ${bus.route_name || "N/A"}</p>
        ${bus.from_destination && bus.to_destination ? 
          `<p style="font-size: 14px; margin: 2px 0;">${bus.from_destination} → ${bus.to_destination}</p>` : ''}
        <p style="font-size: 14px; margin: 2px 0;">Speed: ${speed}</p>
        <p style="font-size: 12px; color: #666; margin: 2px 0;">Last update: ${lastUpdate}</p>
      </div>
    `;

    markerRef.current.bindPopup(popupContent);

    // Auto-center map if enabled
    if (autoCenterRef.current) {
      mapInstanceRef.current.flyTo(position, mapInstanceRef.current.getZoom(), {
        duration: 1
      });
    }
  }, [location, bus]);

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

  const lastUpdate = location.timestamp
    ? new Date(location.timestamp).toLocaleTimeString()
    : "Unknown";
  const speed = location.speed ? `${location.speed.toFixed(1)} km/h` : "N/A";

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapRef} 
        style={{ height, width: "100%", borderRadius: "8px" }}
        className="z-0"
      />

      {showControls && (
        <div className="absolute top-4 right-4 z-[1000] space-y-2">
          <Button
            variant={autoCenterRef.current ? "default" : "outline"}
            size="sm"
            onClick={() => {
              autoCenterRef.current = !autoCenterRef.current;
              // Force re-render by triggering a state update in parent
              if (autoCenterRef.current && location && mapInstanceRef.current) {
                const lat = Number(location.latitude);
                const lng = Number(location.longitude);
                mapInstanceRef.current.flyTo([lat, lng], mapInstanceRef.current.getZoom(), {
                  duration: 1
                });
              }
            }}
          >
            Auto Center: {autoCenterRef.current ? "ON" : "OFF"}
          </Button>
          <Card className="p-2 text-xs">
            <p>Last Update: {lastUpdate}</p>
            <p>Speed: {speed}</p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BusMap;