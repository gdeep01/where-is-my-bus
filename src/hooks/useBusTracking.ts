import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockBuses } from '../lib/mockData';
import { Bus, Trip, BusLocation, BusWithLocation } from '../types';
import toast from 'react-hot-toast';

export const useBusTracking = () => {
  const [buses, setBuses] = useState<BusWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use mock data if Supabase is not configured
      if (!isSupabaseConfigured) {
        console.log('Using mock data for demonstration');
        setBuses(mockBuses);
        return;
      }

      // Fetch buses with their latest locations and current trips
      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select('*')
        .order('bus_number');

      if (busesError) throw busesError;

      // Fetch latest locations for each bus
      const busesWithLocations = await Promise.all(
        busesData.map(async (bus) => {
          // Get latest location
          const { data: locationData } = await supabase
            .from('bus_locations')
            .select('*')
            .eq('bus_id', bus.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          // Get current active trip
          const { data: tripData } = await supabase
            .from('trips')
            .select('*')
            .eq('bus_id', bus.id)
            .eq('status', 'active')
            .order('start_time', { ascending: false })
            .limit(1)
            .single();

          return {
            ...bus,
            latest_location: locationData || undefined,
            current_trip: tripData || undefined,
          };
        })
      );

      setBuses(busesWithLocations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch buses';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const startTrip = useCallback(async (busId: string, conductorName: string) => {
    try {
      // Mock implementation if Supabase not configured
      if (!isSupabaseConfigured) {
        toast.success('Trip started (Demo Mode)');
        const mockTrip = {
          id: Date.now().toString(),
          bus_id: busId,
          conductor_name: conductorName,
          start_time: new Date().toISOString(),
          end_time: null,
          status: 'active' as const,
          created_at: new Date().toISOString(),
        };
        
        // Update mock data
        setBuses(prev => prev.map(bus => 
          bus.id === busId 
            ? { ...bus, status: 'online' as const, current_trip: mockTrip }
            : bus
        ));
        
        return mockTrip;
      }

      // End any existing active trips for this bus
      await supabase
        .from('trips')
        .update({ status: 'completed', end_time: new Date().toISOString() })
        .eq('bus_id', busId)
        .eq('status', 'active');

      // Create new trip
      const { data, error } = await supabase
        .from('trips')
        .insert({
          bus_id: busId,
          conductor_name: conductorName,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Update bus status to online
      await supabase
        .from('buses')
        .update({ status: 'online', updated_at: new Date().toISOString() })
        .eq('id', busId);

      toast.success('Trip started successfully');
      await fetchBuses();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start trip';
      toast.error(errorMessage);
      throw err;
    }
  }, [fetchBuses]);

  const endTrip = useCallback(async (tripId: string, busId: string) => {
    try {
      // Mock implementation if Supabase not configured
      if (!isSupabaseConfigured) {
        toast.success('Trip ended (Demo Mode)');
        setBuses(prev => prev.map(bus => 
          bus.id === busId 
            ? { ...bus, status: 'offline' as const, current_trip: undefined }
            : bus
        ));
        return;
      }

      // End the trip
      const { error } = await supabase
        .from('trips')
        .update({ status: 'completed', end_time: new Date().toISOString() })
        .eq('id', tripId);

      if (error) throw error;

      // Update bus status to offline
      await supabase
        .from('buses')
        .update({ status: 'offline', updated_at: new Date().toISOString() })
        .eq('id', busId);

      toast.success('Trip ended successfully');
      await fetchBuses();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end trip';
      toast.error(errorMessage);
      throw err;
    }
  }, [fetchBuses]);

  const updateLocation = useCallback(async (
    busId: string,
    tripId: string,
    latitude: number,
    longitude: number,
    speed?: number | null,
    accuracy?: number | null
  ) => {
    try {
      // Mock implementation if Supabase not configured
      if (!isSupabaseConfigured) {
        setBuses(prev => prev.map(bus => 
          bus.id === busId 
            ? { 
                ...bus, 
                latest_location: {
                  id: Date.now().toString(),
                  bus_id: busId,
                  trip_id: tripId,
                  latitude,
                  longitude,
                  speed,
                  accuracy,
                  timestamp: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                }
              }
            : bus
        ));
        return;
      }

      const { error } = await supabase
        .from('bus_locations')
        .insert({
          bus_id: busId,
          trip_id: tripId,
          latitude,
          longitude,
          speed,
          accuracy,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      // Update bus status to online and timestamp
      await supabase
        .from('buses')
        .update({ status: 'online', updated_at: new Date().toISOString() })
        .eq('id', busId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update location';
      console.error('Location update error:', errorMessage);
      // Don't show toast for location updates to avoid spam
    }
  }, []);

  const subscribeToLocationUpdates = useCallback((callback: (payload: any) => void) => {
    // Return no-op function if Supabase not configured
    if (!isSupabaseConfigured) {
      return () => {};
    }

    const subscription = supabase
      .channel('bus_locations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bus_locations',
        },
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const subscribeToBusUpdates = useCallback((callback: (payload: any) => void) => {
    // Return no-op function if Supabase not configured
    if (!isSupabaseConfigured) {
      return () => {};
    }

    const subscription = supabase
      .channel('buses')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'buses',
        },
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  return {
    buses,
    loading,
    error,
    fetchBuses,
    startTrip,
    endTrip,
    updateLocation,
    subscribeToLocationUpdates,
    subscribeToBusUpdates,
  };
};