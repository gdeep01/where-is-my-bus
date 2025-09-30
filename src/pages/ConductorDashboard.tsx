import React, { useState, useEffect } from 'react';
import { useBusTracking } from '../hooks/useBusTracking';
import { useGeolocation } from '../hooks/useGeolocation';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { MapPin, Clock, Gauge, Target, Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';

export const ConductorDashboard: React.FC = () => {
  const { buses, loading, startTrip, endTrip, updateLocation } = useBusTracking();
  const { position, error: gpsError, startTracking, stopTracking, isTracking } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
  });

  const [selectedBusId, setSelectedBusId] = useState('');
  const [conductorName, setConductorName] = useState('');
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [isEndingTrip, setIsEndingTrip] = useState(false);

  // Find current bus and trip
  const currentBus = buses.find(bus => bus.id === selectedBusId);
  const activeBus = buses.find(bus => bus.current_trip?.status === 'active');

  // Auto-select active bus if conductor is already on a trip
  useEffect(() => {
    if (activeBus && !selectedBusId) {
      setSelectedBusId(activeBus.id);
      setCurrentTrip(activeBus.current_trip);
      setConductorName(activeBus.current_trip?.conductor_name || '');
    }
  }, [activeBus, selectedBusId]);

  // Update location when position changes and trip is active
  useEffect(() => {
    if (position && currentTrip && selectedBusId) {
      updateLocation(
        selectedBusId,
        currentTrip.id,
        position.coords.latitude,
        position.coords.longitude,
        position.coords.speed,
        position.coords.accuracy
      );
    }
  }, [position, currentTrip, selectedBusId, updateLocation]);

  const handleStartTrip = async () => {
    if (!selectedBusId || !conductorName.trim()) {
      toast.error('Please select a bus and enter conductor name');
      return;
    }

    setIsStartingTrip(true);
    try {
      const trip = await startTrip(selectedBusId, conductorName.trim());
      setCurrentTrip(trip);
      startTracking();
      toast.success('Trip started successfully! GPS tracking enabled.');
    } catch (error) {
      console.error('Failed to start trip:', error);
    } finally {
      setIsStartingTrip(false);
    }
  };

  const handleEndTrip = async () => {
    if (!currentTrip || !selectedBusId) return;

    setIsEndingTrip(true);
    try {
      await endTrip(currentTrip.id, selectedBusId);
      setCurrentTrip(null);
      stopTracking();
      toast.success('Trip ended successfully!');
    } catch (error) {
      console.error('Failed to end trip:', error);
    } finally {
      setIsEndingTrip(false);
    }
  };

  const formatCoordinate = (coord: number) => {
    return coord.toFixed(6);
  };

  const formatSpeed = (speed: number | null) => {
    if (speed === null || speed === undefined) return 'N/A';
    return `${Math.round(speed * 3.6)} km/h`;
  };

  const formatAccuracy = (accuracy: number | null) => {
    if (accuracy === null || accuracy === undefined) return 'N/A';
    return `${Math.round(accuracy)}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Conductor Dashboard</h1>
              <p className="text-sm text-gray-600">Manage your bus trips and share live location</p>
            </div>
            
            {currentTrip && (
              <Badge variant="success" size="sm">
                Trip Active
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trip Management */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Trip Management</h2>
              <p className="text-sm text-gray-600">
                {currentTrip ? 'Manage your active trip' : 'Start a new trip'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentTrip ? (
                <>
                  <Select
                    label="Select Bus"
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    options={buses.map(bus => ({
                      value: bus.id,
                      label: `${bus.bus_number} - ${bus.route_name}`,
                    }))}
                    placeholder="Choose a bus"
                  />
                  
                  <Input
                    label="Conductor Name"
                    value={conductorName}
                    onChange={(e) => setConductorName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current Bus</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {currentBus?.bus_number} - {currentBus?.route_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Conductor</p>
                    <p className="text-lg font-semibold text-gray-900">{conductorName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Trip Started</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(currentTrip.start_time).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              {!currentTrip ? (
                <Button
                  onClick={handleStartTrip}
                  loading={isStartingTrip}
                  disabled={!selectedBusId || !conductorName.trim()}
                  variant="success"
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Trip
                </Button>
              ) : (
                <Button
                  onClick={handleEndTrip}
                  loading={isEndingTrip}
                  variant="danger"
                  className="w-full"
                >
                  <Square className="w-4 h-4 mr-2" />
                  End Trip
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* GPS Status */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">GPS Status</h2>
              <p className="text-sm text-gray-600">
                {isTracking ? 'Location sharing is active' : 'Location sharing is inactive'}
              </p>
            </CardHeader>
            <CardContent>
              {gpsError ? (
                <div className="text-center py-4">
                  <div className="text-red-500 mb-2">
                    <MapPin className="w-8 h-8 mx-auto" />
                  </div>
                  <p className="text-red-600 font-medium">GPS Error</p>
                  <p className="text-sm text-gray-600 mt-1">{gpsError}</p>
                </div>
              ) : position ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Latitude</p>
                      <p className="font-mono text-sm font-semibold">
                        {formatCoordinate(position.coords.latitude)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Longitude</p>
                      <p className="font-mono text-sm font-semibold">
                        {formatCoordinate(position.coords.longitude)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <Gauge className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Speed</p>
                      <p className="font-semibold text-sm">
                        {formatSpeed(position.coords.speed)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <Target className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Accuracy</p>
                      <p className="font-semibold text-sm">
                        {formatAccuracy(position.coords.accuracy)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600">Last Updated</p>
                    <p className="font-semibold text-sm">
                      {new Date(position.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-400 mb-2">
                    <MapPin className="w-8 h-8 mx-auto" />
                  </div>
                  <p className="text-gray-600">
                    {isTracking ? 'Getting GPS location...' : 'GPS not active'}
                  </p>
                  {isTracking && <LoadingSpinner size="sm" className="mt-2" />}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Instructions</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                  1
                </div>
                <p>Select your bus from the dropdown and enter your name as the conductor.</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                  2
                </div>
                <p>Click "Start Trip" to begin your journey. This will enable GPS tracking and mark the bus as online.</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                  3
                </div>
                <p>Your location will be shared automatically every few seconds while the trip is active.</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                  4
                </div>
                <p>When your trip is complete, click "End Trip" to stop location sharing and mark the bus as offline.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};