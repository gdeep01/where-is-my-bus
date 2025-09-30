import React from 'react';
import { Clock, Users, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import type { Bus } from '@/lib/supabase';

interface BusListProps {
  buses: Bus[];
  selectedBusId?: string | null;
  onBusSelect: (bus: Bus) => void;
  loading?: boolean;
  showConductorControls?: boolean;
  currentUserBus?: Bus | null;
  onStartTrip?: (busId: string) => void;
  onEndTrip?: (busId: string) => void;
  activeTripBusId?: string | null;
}

const BusList: React.FC<BusListProps> = ({
  buses,
  selectedBusId,
  onBusSelect,
  loading = false,
  showConductorControls = false,
  currentUserBus = null,
  onStartTrip,
  onEndTrip,
  activeTripBusId,
}) => {
  const formatStatus = (status: string) => {
    switch (status) {
      case 'active':
        return { variant: 'live' as const, label: 'Live' };
      case 'inactive':
        return { variant: 'inactive' as const, label: 'Offline' };
      case 'maintenance':
        return { variant: 'maintenance' as const, label: 'Maintenance' };
      default:
        return { variant: 'inactive' as const, label: 'Unknown' };
    }
  };

  const getLastSeen = () => {
    // This would typically come from the latest bus_location
    return 'Updated 2 min ago';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (buses.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">No buses available</h3>
              <p className="text-muted-foreground">Check back later for available buses.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {buses.map((bus) => {
        const statusInfo = formatStatus(bus.status);
        const isSelected = selectedBusId === bus.id;
        const isCurrentUserBus = currentUserBus?.id === bus.id;
        const hasActiveTrip = activeTripBusId === bus.id;

        return (
          <Card 
            key={bus.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-card ${
              isSelected 
                ? 'ring-2 ring-primary shadow-bus' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onBusSelect(bus)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {bus.bus_number}
                </CardTitle>
                <StatusBadge variant={statusInfo.variant}>
                  {statusInfo.label}
                </StatusBadge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Route Information */}
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-medium">{bus.route_name}</span>
                </div>

                {/* Conductor Information */}
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Conductor: {bus.conductor_id ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>

                {/* Capacity */}
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Capacity: {bus.capacity} passengers
                  </span>
                </div>

                {/* Last Update */}
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {getLastSeen()}
                  </span>
                </div>

                {/* Conductor Controls */}
                {showConductorControls && isCurrentUserBus && (
                  <div className="pt-2 border-t border-border">
                    {hasActiveTrip ? (
                      <EnhancedButton
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEndTrip?.(bus.id);
                        }}
                        className="w-full"
                      >
                        End Trip
                      </EnhancedButton>
                    ) : (
                      <EnhancedButton
                        variant="conductor"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartTrip?.(bus.id);
                        }}
                        className="w-full"
                      >
                        Start Trip
                      </EnhancedButton>
                    )}
                  </div>
                )}

                {/* Passenger Actions */}
                {!showConductorControls && (
                  <div className="pt-2">
                    <EnhancedButton
                      variant={isSelected ? "live" : "passenger"}
                      size="sm"
                      className="w-full"
                    >
                      {isSelected ? "Tracking..." : "Track This Bus"}
                    </EnhancedButton>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BusList;