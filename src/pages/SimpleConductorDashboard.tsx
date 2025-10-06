import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useGeolocation } from '@/hooks/useGeolocation';
import BusMap from '@/components/BusMap';
import { Home, Users, Clock } from 'lucide-react';
import type { Bus, BusLocation } from '@/lib/supabase';

const SimpleConductorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [fromDestination, setFromDestination] = useState('');
  const [toDestination, setToDestination] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const { position, startWatching, stopWatching, getCurrentPosition } = useGeolocation({ watch: false });

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    if (isTracking && position && selectedBus) {
      updateLocation();
    }
  }, [position, isTracking]);

  const fetchBuses = async () => {
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .order('bus_number');
    
    if (error) {
      toast.error('Failed to fetch buses');
      return;
    }
    setBuses(data || []);
  };

  const updateLocation = async () => {
    if (!selectedBus || !position) return;

    const accuracy =
      typeof position.accuracy === 'number' && isFinite(position.accuracy)
        ? Math.min(position.accuracy, 999.99)
        : null;

    const { error } = await supabase.from('bus_locations').insert({
      bus_id: selectedBus.id,
      latitude: position.latitude,
      longitude: position.longitude,
      speed: position.speed || 0,
      accuracy,
      heading: position.heading,
    });

    if (error) {
      console.error('Error updating location:', error);
    } else {
      console.log('Location inserted for bus', selectedBus.id, position);
      setBusLocation({
        bus_id: selectedBus.id,
        latitude: position.latitude,
        longitude: position.longitude,
        speed: position.speed || 0,
        accuracy: position.accuracy,
        heading: position.heading,
        timestamp: new Date().toISOString(),
      } as BusLocation);
    }
  };

  const handleSetRoute = async () => {
    if (!selectedBus || !fromDestination || !toDestination) {
      toast.error('Please select a bus and enter destinations');
      return;
    }

    const { error } = await supabase
      .from('buses')
      .update({
        from_destination: fromDestination,
        to_destination: toDestination,
        status: 'active',
      })
      .eq('id', selectedBus.id);

    if (error) {
      toast.error('Failed to set route');
      return;
    }

    toast.success('Route set successfully');
    setIsTracking(true);
    startWatching();
    // Trigger an immediate position fetch to seed the first location
    getCurrentPosition();
    fetchBuses();
  };

  const handleStopTracking = async () => {
    if (!selectedBus) return;

    const { error } = await supabase
      .from('buses')
      .update({ status: 'inactive' })
      .eq('id', selectedBus.id);

    if (error) {
      toast.error('Failed to stop tracking');
      return;
    }

    setIsTracking(false);
    stopWatching();
    toast.success('Tracking stopped');
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Conductor Dashboard</h1>
          </div>
          <Button 
            onClick={() => navigate('/passenger')} 
            variant="outline"
            className="hidden sm:block"
          >
            Passenger View
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">Select Bus</h2>
                {isTracking && (
                  <Badge variant="default" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Active
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {buses.map((bus) => (
                  <div key={bus.id}>
                    <Button
                      variant={selectedBus?.id === bus.id ? 'default' : 'outline'}
                      className="w-full justify-between"
                      onClick={() => setSelectedBus(bus)}
                    >
                      <span>Bus {bus.bus_number}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {bus.capacity || 50}
                      </Badge>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {selectedBus && (
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Set Route</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="from">From</Label>
                    <Input
                      id="from"
                      value={fromDestination}
                      onChange={(e) => setFromDestination(e.target.value)}
                      placeholder="Starting point"
                      disabled={isTracking}
                    />
                  </div>
                  <div>
                    <Label htmlFor="to">To</Label>
                    <Input
                      id="to"
                      value={toDestination}
                      onChange={(e) => setToDestination(e.target.value)}
                      placeholder="Destination"
                      disabled={isTracking}
                    />
                  </div>
                  {!isTracking ? (
                    <Button onClick={handleSetRoute} className="w-full">
                      Start Trip
                    </Button>
                  ) : (
                    <Button onClick={handleStopTracking} variant="destructive" className="w-full">
                      End Trip
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {position && (
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3">Current Location</h3>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Lat: {position.latitude.toFixed(6)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Lng: {position.longitude.toFixed(6)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Speed: {position.speed?.toFixed(1) || 0} km/h
                  </p>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedBus && busLocation ? (
              <BusMap 
                bus={selectedBus} 
                location={busLocation} 
                height="500px"
                className="h-[400px] sm:h-[500px] lg:h-[calc(100vh-10rem)]"
              />
            ) : (
              <Card className="p-6 sm:p-8 h-[400px] sm:h-[500px] lg:h-[calc(100vh-10rem)] flex items-center justify-center">
                <p className="text-muted-foreground text-center text-sm sm:text-base max-w-md px-4">
                  Select a bus and start tracking to see the map
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleConductorDashboard;
