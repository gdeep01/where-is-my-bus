import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Bus, BusLocation } from "@/lib/supabase";

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
  const isActive = bus.status === "active";

  return (
    <div className={`relative ${className}`}>
      {/* Simple map placeholder with bus info */}
      <div 
        className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center"
        style={{ height, width: "100%" }}
      >
        <div className="text-center p-8">
          {/* Bus icon */}
          <div className="mb-4">
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill={isActive ? "#10b981" : "#6b7280"} 
              className="mx-auto animate-pulse"
            >
              <path d="M12 2C8 2 4 2.5 4 6V16C4 17.1 4.9 18 6 18L5 19V20H7V19H17V20H19V19L18 18C19.1 18 20 17.1 20 16V6C20 2.5 16 2 12 2ZM7.5 17C6.67 17 6 16.33 6 15.5C6 14.67 6.67 14 7.5 14C8.33 14 9 14.67 9 15.5C9 16.33 8.33 17 7.5 17ZM11 10H6V6H11V10ZM13 10V6H18V10H13ZM16.5 17C15.67 17 15 16.33 15 15.5C15 14.67 15.67 14 16.5 14C17.33 14 18 14.67 18 15.5C18 16.33 17.33 17 16.5 17Z"/>
            </svg>
          </div>

          {/* Bus info */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Bus {bus.bus_number}</h3>
            <p className="text-sm">Status: <span className={`font-semibold ${isActive ? 'text-green-600' : 'text-gray-500'}`}>{bus.status}</span></p>
            <p className="text-sm">Route: {bus.route_name || "N/A"}</p>
            {bus.from_destination && bus.to_destination && (
              <p className="text-sm font-medium">
                {bus.from_destination} → {bus.to_destination}
              </p>
            )}
            <p className="text-sm">Speed: {speed}</p>
            <p className="text-xs text-muted-foreground">
              Last update: {lastUpdate}
            </p>
            <p className="text-xs text-muted-foreground">
              Location: {Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)}
            </p>
          </div>
        </div>
      </div>

      {showControls && (
        <div className="absolute top-4 right-4 space-y-2">
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