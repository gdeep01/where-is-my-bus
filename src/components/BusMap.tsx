import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { BusLocation, Bus } from '@/lib/supabase';
import { StatusBadge } from '@/components/ui/status-badge';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bus icon
const createBusIcon = (isActive: boolean) => {
  const svgIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="16" rx="3" fill="${isActive ? '#00D4FF' : '#6B7280'}" stroke="#ffffff" stroke-width="2"/>
      <rect x="6" y="10" width="6" height="4" rx="1" fill="#ffffff"/>
      <rect x="14" y="10" width="6" height="4" rx="1" fill="#ffffff"/>
      <rect x="22" y="10" width="6" height="4" rx="1" fill="#ffffff"/>
      <circle cx="10" cy="26" r="2" fill="#374151"/>
      <circle cx="22" cy="26" r="2" fill="#374151"/>
      <rect x="12" y="24" width="8" height="2" fill="${isActive ? '#00D4FF' : '#6B7280'}"/>
      ${isActive ? '<circle cx="16" cy="16" r="1" fill="#00FF00" opacity="0.8"><animate attributeName="r" values="1;2;1" dur="2s" repeatCount="indefinite"/></circle>' : ''}
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'bus-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

interface MapControllerProps {
  location: BusLocation | null;
  autoCenter: boolean;
}

const MapController: React.FC<MapControllerProps> = ({ location, autoCenter }) => {
  const map = useMap();
  const prevLocationRef = useRef<BusLocation | null>(null);

  useEffect(() => {
    if (location && autoCenter) {
      const prevLocation = prevLocationRef.current;
      
      if (!prevLocation || 
          Math.abs(prevLocation.latitude - location.latitude) > 0.001 ||
          Math.abs(prevLocation.longitude - location.longitude) > 0.001) {
        
        map.flyTo([Number(location.latitude), Number(location.longitude)], 16, {
          animate: true,
          duration: 1.5,
        });
      }
      
      prevLocationRef.current = location;
    }
  }, [location, autoCenter, map]);

  return null;
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
  height = "400px",
  showControls = true 
}) => {
  const [autoCenter, setAutoCenter] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Default center (downtown area)
  const defaultCenter: [number, number] = [40.7128, -74.0060]; // New York City
  const center: [number, number] = location 
    ? [Number(location.latitude), Number(location.longitude)]
    : defaultCenter;

  const isActive = bus?.status === 'active';
  const busIcon = createBusIcon(isActive);

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const formatSpeed = (speed: number | null) => {
    if (!speed || speed === 0) return '0 km/h';
    return `${Math.round(speed)} km/h`;
  };

  useEffect(() => {
    // Reset map error when component mounts
    setMapError(null);
  }, []);

  if (mapError) {
    return (
      <div 
        className={`flex items-center justify-center bg-card border border-border rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold text-foreground mb-2">Map Error</h3>
          <p className="text-muted-foreground mb-4">{mapError}</p>
          <button
            onClick={() => setMapError(null)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-border ${className}`}>
      {/* Map Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => setAutoCenter(!autoCenter)}
            className={`px-3 py-1 text-xs rounded-md shadow-md transition-colors ${
              autoCenter 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background text-foreground border border-border'
            }`}
          >
            Auto Center: {autoCenter ? 'ON' : 'OFF'}
          </button>
          
          {location && (
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-md p-2 text-xs">
              <div className="font-medium">Last Update</div>
              <div className="text-muted-foreground">{formatLastUpdate(location.timestamp)}</div>
              <div className="text-muted-foreground">Speed: {formatSpeed(Number(location.speed))}</div>
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {!location && bus && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading bus location...</p>
          </div>
        </div>
      )}

      {/* No location overlay */}
      {!location && !bus && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Select a bus to view its location</p>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={location ? 16 : 12}
        style={{ height, width: '100%' }}
        className="z-0"
        whenReady={() => setMapError(null)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController location={location} autoCenter={autoCenter} />
        
        {location && bus && (
          <Marker
            position={[Number(location.latitude), Number(location.longitude)]}
            icon={busIcon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-base">{bus.bus_number}</h3>
                  <StatusBadge variant={isActive ? "active" : "inactive"}>
                    {bus.status}
                  </StatusBadge>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div><strong>Route:</strong> {bus.route_name}</div>
                  <div><strong>Speed:</strong> {formatSpeed(Number(location.speed))}</div>
                  <div><strong>Last Update:</strong> {formatLastUpdate(location.timestamp)}</div>
                  {location.accuracy && (
                    <div><strong>Accuracy:</strong> ±{Math.round(Number(location.accuracy))}m</div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default BusMap;