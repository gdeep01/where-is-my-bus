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
      const matchFrom = !fromSearch || 
        bus.from_destination?.toLowerCase().includes(fromSearch.toLowerCase());
      const matchTo = !toSearch || 
        bus.to_destination?.toLowerCase().includes(toSearch.toLowerCase());
      return matchFrom && matchTo;
    });

    setFilteredBuses(filtered);
  };

  const handleBusSelect = async (bus: Bus) => {
    setSelectedBus(bus);
    
    // Fetch latest location
    const { data, error } = await supabase
      .from('bus_locations')
      .select('*')
      .eq('bus_id', bus.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setBusLocation(data);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Track Your Bus</h1>
          <Button onClick={() => navigate('/conductor')} variant="outline">
            Conductor Dashboard
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <h2 className="text-xl font-semibold mb-4">Available Buses</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
                      <p className="text-sm text-muted-foreground">
                        {bus.from_destination} → {bus.to_destination}
                      </p>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedBus && busLocation ? (
              <BusMap bus={selectedBus} location={busLocation} height="calc(100vh - 200px)" />
            ) : (
              <Card className="p-8 h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg text-muted-foreground mb-2">
                    Select a bus to track its location
                  </p>
                  <p className="text-sm text-muted-foreground">
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
