import { useState, useEffect, useCallback } from 'react';
import { supabase, type Bus, type BusLocation, type Trip, LocationUpdateThrottle } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useGeolocation } from './useGeolocation';

export const useBusTracking = (busId: string | null) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [busLocations, setBusLocations] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const { position, startWatching, stopWatching, isWatching } = useGeolocation({
    watch: false,
    enableHighAccuracy: true,
  });

  // Rate limiting for location updates
  const locationThrottle = new LocationUpdateThrottle();

  // Fetch all buses
  const fetchBuses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .order('bus_number');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch buses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch bus locations for a specific bus
  const fetchBusLocations = useCallback(async (busId: string) => {
    try {
      const { data, error } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('bus_id', busId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) throw error;
      setBusLocations(data || []);
    } catch (error) {
      console.error('Error fetching bus locations:', error);
    }
  }, []);

  // Start a trip (conductor only)
  const startTrip = useCallback(async (busId: string, conductorId: string) => {
    try {
      // First, update bus status to active
      const { error: busError } = await supabase
        .from('buses')
        .update({ 
          status: 'active',
          conductor_id: conductorId,
        })
        .eq('id', busId);

      if (busError) throw busError;

      // Create new trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          bus_id: busId,
          conductor_id: conductorId,
          is_active: true,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      setCurrentTrip(tripData);
      
      // Start location tracking
      startWatching();

      toast({
        title: "Trip Started",
        description: "Your trip has been started successfully",
      });

      return { success: true, trip: tripData };
    } catch (error) {
      console.error('Error starting trip:', error);
      toast({
        title: "Error",
        description: "Failed to start trip",
        variant: "destructive",
      });
      return { success: false, error };
    }
  }, [startWatching, toast]);

  // End a trip (conductor only)
  const endTrip = useCallback(async (tripId: string, busId: string) => {
    try {
      // Update trip as ended
      const { error: tripError } = await supabase
        .from('trips')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', tripId);

      if (tripError) throw tripError;

      // Update bus status to inactive
      const { error: busError } = await supabase
        .from('buses')
        .update({ status: 'inactive' })
        .eq('id', busId);

      if (busError) throw busError;

      setCurrentTrip(null);
      
      // Stop location tracking
      stopWatching();

      toast({
        title: "Trip Ended",
        description: "Your trip has been ended successfully",
      });

      return { success: true };
    } catch (error) {
      console.error('Error ending trip:', error);
      toast({
        title: "Error",
        description: "Failed to end trip",
        variant: "destructive",
      });
      return { success: false, error };
    }
  }, [stopWatching, toast]);

  // Update bus location
  const updateBusLocation = useCallback(async (
    busId: string,
    tripId: string,
    latitude: number,
    longitude: number,
    speed?: number,
    heading?: number,
    accuracy?: number
  ) => {
    if (!locationThrottle.canUpdate()) {
      return; // Rate limited
    }

    try {
      const { error } = await supabase
        .from('bus_locations')
        .insert({
          bus_id: busId,
          trip_id: tripId,
          latitude,
          longitude,
          speed: speed || 0,
          heading: heading || null,
          accuracy: accuracy || null,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating bus location:', error);
    }
  }, []);

  // Auto-update location when position changes during active trip
  useEffect(() => {
    if (position && currentTrip && currentTrip.is_active) {
      updateBusLocation(
        currentTrip.bus_id,
        currentTrip.id,
        position.latitude,
        position.longitude,
        position.speed || 0,
        position.heading || undefined,
        position.accuracy
      );
    }
  }, [position, currentTrip, updateBusLocation]);

  // Set up realtime subscriptions
  useEffect(() => {
    const busChannel = supabase
      .channel('buses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buses',
        },
        () => {
          fetchBuses();
        }
      )
      .subscribe();

    const locationChannel = supabase
      .channel('bus_locations_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bus_locations',
        },
        (payload) => {
          if (busId && payload.new.bus_id === busId) {
            setBusLocations(prev => [payload.new as BusLocation, ...prev.slice(0, 9)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(busChannel);
      supabase.removeChannel(locationChannel);
    };
  }, [fetchBuses, busId]);

  // Initial data fetch
  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  // Fetch locations when bus is selected
  useEffect(() => {
    if (busId) {
      fetchBusLocations(busId);
      const bus = buses.find(b => b.id === busId);
      setSelectedBus(bus || null);
    }
  }, [busId, buses, fetchBusLocations]);

  return {
    buses,
    selectedBus,
    currentTrip,
    busLocations: busLocations.slice(0, 1), // Only latest location
    loading,
    isTracking: isWatching,
    position,
    startTrip,
    endTrip,
    updateBusLocation,
    fetchBuses,
  };
};