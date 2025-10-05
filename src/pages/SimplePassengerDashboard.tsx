import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import BusMap from '@/components/BusMap';
import type { Bus, BusLocation } from '@/lib/supabase';

const SimplePassengerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');

  useEffect(() => {
    fetchBuses();
    
    // Subscribe to bus and location updates
    const busChannel = supabase
      .channel('buses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'buses' },
        () => fetchBuses()
      )
      .subscribe();

    const locationChannel = supabase
      .channel('locations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bus_locations' },
        (payload) => {
          if (selectedBus && payload.new && (payload.new as any).bus_id === selectedBus.id) {
            setBusLocation(payload.new as BusLocation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(busChannel);
      supabase.removeChannel(locationChannel);
    };
  }, [selectedBus]);

  const fetchBuses = async () => {
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .eq('status', 'active')
      .order('bus_number');
    
    if (!error && data) {
      setBuses(data);
      setFilteredBuses(data);
    }
  };

  const handleSearch = () => {
    if (!fromSearch && !toSearch) {
      setFilteredBuses(buses);
      return;
    }

    const filtered = buses.filter((bus) => {
      // Build complete route: from -> stops -> to
      const completeRoute = [
        bus.from_destination || '',
        ...(bus.stops || []),
        bus.to_destination || ''
      ].map(stop => stop.toLowerCase().trim());

      const searchFrom = fromSearch.toLowerCase().trim();
      const searchTo = toSearch.toLowerCase().trim();

      // If only searching by "from"
      if (searchFrom && !searchTo) {
        return completeRoute.some(stop => stop.includes(searchFrom));
      }

      // If only searching by "to"
      if (!searchFrom && searchTo) {
        return completeRoute.some(stop => stop.includes(searchTo));
      }

      // If searching by both, check if they appear in order
      const fromIndex = completeRoute.findIndex(stop => stop.includes(searchFrom));
      const toIndex = completeRoute.findIndex(stop => stop.includes(searchTo));

      // Both must exist and "from" must come before "to"
      return fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex;
    });

    setFilteredBuses(filtered);
  };

  const handleBusSelect = async (bus: Bus) => {
    console.log('Bus selected:', bus);
    setSelectedBus(bus);
    
    // Fetch latest location
    const { data, error } = await supabase
      .from('bus_locations')
      .select('*')
      .eq('bus_id', bus.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle(); // Changed from .single() to .maybeSingle() to handle no data

    console.log('Location data:', data, 'Error:', error);
    
    if (!error && data) {
      setBusLocation(data);
    } else if (!data) {
      console.log('No location data found for this bus');
      setBusLocation(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6 px-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Track Your Bus</h1>
          <Button 
            onClick={() => navigate('/conductor')} 
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            Conductor Dashboard
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <h2 className="text-xl font-semibold mb-4">Search Route</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="from-search">From</Label>
                  <Input
                    id="from-search"
                    value={fromSearch}
                    onChange={(e) => setFromSearch(e.target.value)}
                    placeholder="Enter starting point"
                  />
                </div>
                <div>
                  <Label htmlFor="to-search">To</Label>
                  <Input
                    id="to-search"
                    value={toSearch}
                    onChange={(e) => setToSearch(e.target.value)}
                    placeholder="Enter destination"
                  />
                </div>
                <Button onClick={handleSearch} className="w-full">
                  Search Buses
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Available Buses</h2>
              <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                {filteredBuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No buses found on this route
                  </p>
                ) : (
                  filteredBuses.map((bus) => (
                    <Card
                      key={bus.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedBus?.id === bus.id ? 'bg-primary/10' : 'hover:bg-accent'
                      }`}
                      onClick={() => handleBusSelect(bus)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Bus {bus.bus_number}</h3>
                        <StatusBadge variant={bus.status as any}>
                          {bus.status}
                        </StatusBadge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">{bus.from_destination}</p>
                        {bus.stops && bus.stops.length > 0 && (
                          <p className="text-xs pl-3 py-1">
                            via {bus.stops.join(' → ')}
                          </p>
                        )}
                        <p className="font-medium">{bus.to_destination}</p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedBus ? (
              busLocation ? (
                <BusMap 
                  bus={selectedBus} 
                  location={busLocation} 
                  height="calc(100vh - 120px)"
                  className="min-h-[400px]"
                />
              ) : (
                <Card className="p-4 sm:p-8 h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center px-4">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-base sm:text-lg text-muted-foreground mb-2">
                      Waiting for location data for Bus {selectedBus.bus_number}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      The conductor needs to start tracking this bus first
                    </p>
                  </div>
                </Card>
              )
            ) : (
              <Card className="p-4 sm:p-8 h-full min-h-[400px] flex items-center justify-center">
                <div className="text-center px-4">
                  <p className="text-base sm:text-lg text-muted-foreground mb-2">
                    Select a bus to track its location
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Use the search filters to find buses on your route
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePassengerDashboard;
