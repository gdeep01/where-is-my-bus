import React, { useState, useEffect } from 'react';
import { BusList } from '../components/BusList';
import { BusMap } from '../components/BusMap';
import { useBusTracking } from '../hooks/useBusTracking';
import { BusWithLocation } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { RefreshCw, MapPin, List } from 'lucide-react';
import toast from 'react-hot-toast';

export const PassengerDashboard: React.FC = () => {
  const {
    buses,
    loading,
    error,
    fetchBuses,
    subscribeToLocationUpdates,
    subscribeToBusUpdates,
  } = useBusTracking();

  const [selectedBus, setSelectedBus] = useState<BusWithLocation | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeLocations = subscribeToLocationUpdates((payload) => {
      console.log('Location update received:', payload);
      fetchBuses(); // Refresh buses when location updates
    });

    const unsubscribeBuses = subscribeToBusUpdates((payload) => {
      console.log('Bus update received:', payload);
      fetchBuses(); // Refresh buses when bus status changes
    });

    return () => {
      unsubscribeLocations();
      unsubscribeBuses();
    };
  }, [subscribeToLocationUpdates, subscribeToBusUpdates, fetchBuses]);

  const handleBusSelect = (bus: BusWithLocation) => {
    setSelectedBus(bus);
    if (viewMode === 'list') {
      setViewMode('map');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBuses();
      toast.success('Data refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const onlineBuses = buses.filter(bus => bus.status === 'online');
  const offlineBuses = buses.filter(bus => bus.status === 'offline');

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Bus Tracking</h1>
              <p className="text-sm text-gray-600">Track buses across Karnataka in real-time</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Badge variant="success" size="sm">
                  {onlineBuses.length} Online
                </Badge>
                <Badge variant="danger" size="sm">
                  {offlineBuses.length} Offline
                </Badge>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile view toggle */}
        <div className="lg:hidden mb-4">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              Bus List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Map View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bus List - Hidden on mobile when map is selected */}
          <div className={`lg:col-span-1 ${viewMode === 'map' ? 'hidden lg:block' : ''}`}>
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Available Buses</h2>
                <p className="text-sm text-gray-600">
                  Select a bus to view its location on the map
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto p-4">
                  <BusList
                    buses={buses}
                    loading={loading}
                    selectedBusId={selectedBus?.id}
                    onBusSelect={handleBusSelect}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map - Hidden on mobile when list is selected */}
          <div className={`lg:col-span-2 ${viewMode === 'list' ? 'hidden lg:block' : ''}`}>
            <Card className="h-[600px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Live Map</h2>
                    <p className="text-sm text-gray-600">
                      {selectedBus 
                        ? `Tracking ${selectedBus.bus_number} - ${selectedBus.route_name}`
                        : 'Select a bus to track its location'
                      }
                    </p>
                  </div>
                  {selectedBus && (
                    <Badge 
                      variant={selectedBus.status === 'online' ? 'success' : 'danger'}
                      size="sm"
                    >
                      {selectedBus.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 h-full">
                <div className="h-[500px]">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : (
                    <BusMap
                      buses={buses}
                      selectedBusId={selectedBus?.id}
                      onBusSelect={handleBusSelect}
                      className="h-full"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Selected Bus Details */}
        {selectedBus && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Bus Details</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bus Number</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedBus.bus_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Route</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedBus.route_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <Badge variant={selectedBus.status === 'online' ? 'success' : 'danger'}>
                      {selectedBus.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Capacity</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedBus.capacity} seats</p>
                  </div>
                </div>

                {selectedBus.current_trip && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Current Trip</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Conductor</p>
                        <p className="text-md text-gray-900">{selectedBus.current_trip.conductor_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Started At</p>
                        <p className="text-md text-gray-900">
                          {new Date(selectedBus.current_trip.start_time).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Trip Status</p>
                        <Badge variant={selectedBus.current_trip.status === 'active' ? 'success' : 'default'}>
                          {selectedBus.current_trip.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};