import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import BusMap from '@/components/BusMap';
import { Home, RefreshCw, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Bus, BusLocation } from '@/lib/supabase';

const SimplePassengerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const [searchHistory, setSearchHistory] = useState<Array<{from: string, to: string}>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchBuses();
    
    // Load search history from localStorage
    const savedHistory = localStorage.getItem('busSearchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
    
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
      // Don't auto-populate filtered buses - only show after search
      if (fromSearch || toSearch) {
        handleSearchWithData(data);
      }
    }
  };

  const handleSearchWithData = (busData: Bus[]) => {
    if (!fromSearch && !toSearch) {
      setFilteredBuses([]);
      return;
    }

    const filtered = busData.filter((bus) => {
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
        return completeRoute.some(stop => stop === searchFrom);
      }

      // If only searching by "to"
      if (!searchFrom && searchTo) {
        return completeRoute.some(stop => stop === searchTo);
      }

      // If searching by both, check if they appear in order
      const fromIndex = completeRoute.findIndex(stop => stop === searchFrom);
      const toIndex = completeRoute.findIndex(stop => stop === searchTo);

      // Both must exist and "from" must come before "to"
      return fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex;
    });

    setFilteredBuses(filtered);
  };

  const handleSearch = () => {
    handleSearchWithData(buses);
    
    // Save to search history if both fields are filled
    if (fromSearch.trim() && toSearch.trim()) {
      const newSearch = { from: fromSearch, to: toSearch };
      const updatedHistory = [newSearch, ...searchHistory.filter(
        item => !(item.from === fromSearch && item.to === toSearch)
      )].slice(0, 5); // Keep only last 5 searches
      
      setSearchHistory(updatedHistory);
      localStorage.setItem('busSearchHistory', JSON.stringify(updatedHistory));
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBuses();
    if (selectedBus) {
      await handleBusSelect(selectedBus);
    }
    toast.success('Bus data updated');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const useSearchHistory = (history: {from: string, to: string}) => {
    setFromSearch(history.from);
    setToSearch(history.to);
  };

  const getCapacityColor = (status: string) => {
    return status === 'active' ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
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
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Track Your Bus</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              onClick={() => navigate('/conductor')} 
              variant="outline"
              className="w-full sm:w-auto whitespace-nowrap"
            >
              Conductor Dashboard
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Search Route</h2>
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

                {searchHistory.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">Recent:</p>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.map((history, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => useSearchHistory(history)}
                          className="text-xs h-7"
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          {history.from} → {history.to}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Available Buses</h2>
              <div className="space-y-2 max-h-[300px] sm:max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                {!fromSearch && !toSearch ? (
                  <p className="text-sm text-muted-foreground">
                    Enter a route to search for available buses
                  </p>
                ) : filteredBuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active buses found on this route
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
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Users className="h-3 w-3" />
                        <span>Capacity: {bus.capacity || 50} seats</span>
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
                  height="500px"
                  className="h-[400px] sm:h-[500px] lg:h-[calc(100vh-10rem)]"
                />
              ) : (
                <Card className="p-6 sm:p-8 h-[400px] sm:h-[500px] lg:h-[calc(100vh-10rem)] flex items-center justify-center">
                  <div className="text-center px-4 max-w-md">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-base sm:text-lg font-medium text-foreground mb-2">
                      Waiting for location data for Bus {selectedBus.bus_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The conductor needs to start tracking this bus first
                    </p>
                  </div>
                </Card>
              )
            ) : (
              <Card className="p-6 sm:p-8 h-[400px] sm:h-[500px] lg:h-[calc(100vh-10rem)] flex items-center justify-center">
                <div className="text-center px-4 max-w-md">
                  <p className="text-base sm:text-lg font-medium text-foreground mb-2">
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
