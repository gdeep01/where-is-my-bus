import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { BusWithLocation } from '../types';
import { Badge } from './ui/Badge';
import 'leaflet/dist/leaflet.css';

// Custom bus icon
const busIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="28" height="20" rx="4" fill="#3B82F6"/>
      <rect x="4" y="10" width="24" height="16" rx="2" fill="#1E40AF"/>
      <rect x="6" y="12" width="6" height="4" rx="1" fill="#60A5FA"/>
      <rect x="14" y="12" width="6" height="4" rx="1" fill="#60A5FA"/>
      <rect x="22" y="12" width="6" height="4" rx="1" fill="#60A5FA"/>
      <circle cx="8" cy="26" r="2" fill="#374151"/>
      <circle cx="24" cy="26" r="2" fill="#374151"/>
      <rect x="12" y="6" width="8" height="4" rx="2" fill="#EF4444"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface MapUpdaterProps {
  center: LatLngExpression;
  zoom: number;
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
};

interface BusMapProps {
  buses: BusWithLocation[];
  selectedBusId?: string;
  onBusSelect?: (bus: BusWithLocation) => void;
  className?: string;
}

export const BusMap: React.FC<BusMapProps> = ({
  buses,
  selectedBusId,
  onBusSelect,
  className = '',
}) => {
  const mapRef = useRef<any>(null);
  
  // Default center (Bangalore, Karnataka)
  const defaultCenter: LatLngExpression = [12.9716, 77.5946];
  const defaultZoom = 10;

  // Find selected bus or use default center
  const selectedBus = buses.find(bus => bus.id === selectedBusId);
  const mapCenter = selectedBus?.latest_location 
    ? [selectedBus.latest_location.latitude, selectedBus.latest_location.longitude] as LatLngExpression
    : defaultCenter;
  const mapZoom = selectedBus?.latest_location ? 15 : defaultZoom;

  // Filter buses with locations
  const busesWithLocations = buses.filter(bus => bus.latest_location);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatSpeed = (speed: number | null) => {
    if (speed === null || speed === undefined) return 'N/A';
    return `${Math.round(speed * 3.6)} km/h`; // Convert m/s to km/h
  };

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {busesWithLocations.map((bus) => (
          <Marker
            key={bus.id}
            position={[bus.latest_location!.latitude, bus.latest_location!.longitude]}
            icon={busIcon}
            eventHandlers={{
              click: () => onBusSelect?.(bus),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{bus.bus_number}</h3>
                  <Badge variant={bus.status === 'online' ? 'success' : 'danger'}>
                    {bus.status}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm">
                  <p><strong>Route:</strong> {bus.route_name}</p>
                  {bus.current_trip && (
                    <p><strong>Conductor:</strong> {bus.current_trip.conductor_name}</p>
                  )}
                  <p><strong>Speed:</strong> {formatSpeed(bus.latest_location!.speed)}</p>
                  <p><strong>Accuracy:</strong> {bus.latest_location!.accuracy ? `${Math.round(bus.latest_location!.accuracy)}m` : 'N/A'}</p>
                  <p><strong>Last Updated:</strong> {formatTimestamp(bus.latest_location!.timestamp)}</p>
                </div>
                
                <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                  <p>Lat: {bus.latest_location!.latitude.toFixed(6)}</p>
                  <p>Lng: {bus.latest_location!.longitude.toFixed(6)}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {busesWithLocations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
          <div className="text-center">
            <p className="text-gray-600 mb-2">No buses with location data available</p>
            <p className="text-sm text-gray-500">Buses will appear here when they start sharing their location</p>
          </div>
        </div>
      )}
    </div>
  );
};