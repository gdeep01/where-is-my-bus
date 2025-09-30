import React from 'react';
import { BusWithLocation } from '../types';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { MapPin, Clock, User } from 'lucide-react';

interface BusListProps {
  buses: BusWithLocation[];
  loading: boolean;
  selectedBusId?: string;
  onBusSelect: (bus: BusWithLocation) => void;
}

export const BusList: React.FC<BusListProps> = ({
  buses,
  loading,
  selectedBusId,
  onBusSelect,
}) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const formatSpeed = (speed: number | null) => {
    if (speed === null || speed === undefined) return 'N/A';
    return `${Math.round(speed * 3.6)} km/h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (buses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-2">No buses available</p>
        <p className="text-sm text-gray-500">Check back later for bus updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {buses.map((bus) => (
        <Card
          key={bus.id}
          onClick={() => onBusSelect(bus)}
          className={`transition-all duration-200 ${
            selectedBusId === bus.id 
              ? 'ring-2 ring-blue-500 shadow-lg' 
              : 'hover:shadow-md'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {bus.bus_number}
                </h3>
                <p className="text-gray-600 text-sm">{bus.route_name}</p>
              </div>
              <Badge 
                variant={bus.status === 'online' ? 'success' : 'danger'}
                size="sm"
              >
                {bus.status}
              </Badge>
            </div>

            {bus.current_trip && (
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <User className="w-4 h-4 mr-1" />
                <span>Conductor: {bus.current_trip.conductor_name}</span>
              </div>
            )}

            {bus.latest_location ? (
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>
                    {bus.latest_location.latitude.toFixed(4)}, {bus.latest_location.longitude.toFixed(4)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Speed: {formatSpeed(bus.latest_location.speed)}
                  </span>
                  <div className="flex items-center text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{formatTimestamp(bus.latest_location.timestamp)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No location data available
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};