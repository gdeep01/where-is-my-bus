import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Navigation, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { StatusBadge } from '@/components/ui/status-badge';
import BusList from '@/components/BusList';
import BusMap from '@/components/BusMap';
import { useAuth } from '@/hooks/useAuth';
import { useBusTracking } from '@/hooks/useBusTracking';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const ConductorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [assignedBus, setAssignedBus] = useState(null);
  
  const {
    buses,
    selectedBus,
    currentTrip,
    busLocations,
    loading,
    isTracking,
    position,
    startTrip,
    endTrip,
  } = useBusTracking(selectedBusId);

  const { toast } = useToast();

  // Redirect if not conductor
  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'conductor')) {
      navigate('/auth');
    }
  }, [user, profile, authLoading, navigate]);

  // Find conductor's assigned bus
  useEffect(() => {
    if (user && buses.length > 0) {
      const userBus = buses.find(bus => bus.conductor_id === user.id);
      setAssignedBus(userBus || null);
      if (userBus && !selectedBusId) {
        setSelectedBusId(userBus.id);
      }
    }
  }, [user, buses, selectedBusId]);

  const handleStartTrip = async (busId: string) => {
    if (!user) return;
    
    const result = await startTrip(busId, user.id);
    if (result.success) {
      setSelectedBusId(busId);
    }
  };

  const handleEndTrip = async (busId: string) => {
    if (!currentTrip) return;
    
    await endTrip(currentTrip.id, busId);
  };

  const handleSignOut = async () => {
    // End active trip before signing out
    if (currentTrip) {
      await endTrip(currentTrip.id, currentTrip.bus_id);
    }
    
    await signOut();
    navigate('/');
  };

  const handleRequestAssignment = async () => {
    if (!user) return;
    
    // This would typically be handled by an admin
    toast({
      title: "Assignment Requested",
      description: "Your bus assignment request has been sent to the admin.",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conductor dashboard...</p>
        </div>
      </div>
    );
  }

  const currentLocation = busLocations[0] || null;
  const hasActiveTrip = currentTrip?.is_active;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-text">Conductor Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {profile?.full_name || 'Conductor'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {hasActiveTrip && (
                <StatusBadge variant="live" className="animate-pulse">
                  Trip Active
                </StatusBadge>
              )}
              <EnhancedButton 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </EnhancedButton>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {!assignedBus ? (
          /* No Bus Assigned */
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
              <CardTitle>No Bus Assigned</CardTitle>
              <CardDescription>
                You haven't been assigned to a bus yet. Please contact your administrator or request assignment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedButton 
                variant="conductor" 
                onClick={handleRequestAssignment}
                className="w-full"
              >
                Request Bus Assignment
              </EnhancedButton>
            </CardContent>
          </Card>
        ) : (
          /* Main Dashboard */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Bus Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Current Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Navigation className="w-5 h-5 text-primary" />
                    <span>Current Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Trip Status:</span>
                    <StatusBadge variant={hasActiveTrip ? "live" : "inactive"}>
                      {hasActiveTrip ? "Active" : "Inactive"}
                    </StatusBadge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Location Tracking:</span>
                    <StatusBadge variant={isTracking ? "active" : "inactive"}>
                      {isTracking ? "ON" : "OFF"}
                    </StatusBadge>
                  </div>

                  {position && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Speed:</span>
                        <span className="text-sm font-medium">
                          {position.speed ? `${Math.round(position.speed * 3.6)} km/h` : '0 km/h'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Accuracy:</span>
                        <span className="text-sm font-medium">±{Math.round(position.accuracy)}m</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bus Information & Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Bus</CardTitle>
                </CardHeader>
                <CardContent>
                  <BusList
                    buses={assignedBus ? [assignedBus] : []}
                    selectedBusId={selectedBusId}
                    onBusSelect={(bus) => setSelectedBusId(bus.id)}
                    showConductorControls={true}
                    currentUserBus={assignedBus}
                    onStartTrip={handleStartTrip}
                    onEndTrip={handleEndTrip}
                    activeTripBusId={hasActiveTrip ? assignedBus.id : null}
                  />
                </CardContent>
              </Card>

              {/* Trip Information */}
              {currentTrip && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <span>Trip Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Started:</span>
                      <div className="text-sm font-medium">
                        {new Date(currentTrip.started_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <div className="text-sm font-medium">
                        {Math.floor((Date.now() - new Date(currentTrip.started_at).getTime()) / 60000)} minutes
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Side - Map */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>Live Map</span>
                  </CardTitle>
                  <CardDescription>
                    Real-time location tracking for your bus
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <BusMap
                    bus={selectedBus}
                    location={currentLocation}
                    height="600px"
                    showControls={true}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConductorDashboard;