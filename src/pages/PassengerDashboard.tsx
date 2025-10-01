import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Menu, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import BusList from '@/components/BusList';
import BusMap from '@/components/BusMap';
import { useAuth } from '@/hooks/useAuth';
import { useBusTracking } from '@/hooks/useBusTracking';

const PassengerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const {
    buses,
    selectedBus,
    busLocations,
    loading,
  } = useBusTracking(selectedBusId);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleBusSelect = (bus: { id: string }) => {
    setSelectedBusId(bus.id);
    setSidebarOpen(false); // Close mobile sidebar
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bus information...</p>
        </div>
      </div>
    );
  }

  const currentLocation = busLocations[0] || null;

  const BusListContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Available Buses</h2>
        <div className="text-sm text-muted-foreground">
          {buses.length} buses
        </div>
      </div>
      
      <BusList
        buses={buses}
        selectedBusId={selectedBusId}
        onBusSelect={handleBusSelect}
        loading={loading}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <EnhancedButton 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden"
                  >
                    <Menu className="w-5 h-5" />
                  </EnhancedButton>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-6">
                  <BusListContent />
                </SheetContent>
              </Sheet>

              <div>
                <h1 className="text-2xl font-bold gradient-text">Where Is My Bus</h1>
                <p className="text-muted-foreground">
                  Real-time bus tracking
                  {profile && ` • Welcome, ${profile.full_name}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <EnhancedButton 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </EnhancedButton>
              ) : (
                <EnhancedButton 
                  variant="conductor"
                  size="sm" 
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </EnhancedButton>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Bus List</CardTitle>
                <CardDescription>
                  Select a bus to track its real-time location
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <BusListContent />
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Map */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <CardTitle>
                      {selectedBus ? `${selectedBus.bus_number} - ${selectedBus.route_name}` : 'Live Map'}
                    </CardTitle>
                  </div>
                  {selectedBus && (
                    <EnhancedButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBusId(null)}
                    >
                      <X className="w-4 h-4" />
                    </EnhancedButton>
                  )}
                </div>
                <CardDescription>
                  {selectedBus 
                    ? 'Real-time location and status' 
                    : 'Select a bus from the list to start tracking'
                  }
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
      </div>

      {/* Mobile floating action button for bus list */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <EnhancedButton 
              variant="conductor"
              size="icon"
              className="h-14 w-14 rounded-full shadow-glow"
            >
              <Menu className="w-6 h-6" />
            </EnhancedButton>
          </SheetTrigger>
        </Sheet>
      </div>
    </div>
  );
};

export default PassengerDashboard;