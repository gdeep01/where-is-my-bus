import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Bus = Database['public']['Tables']['buses']['Row'];
export type Trip = Database['public']['Tables']['trips']['Row'];
export type BusLocation = Database['public']['Tables']['bus_locations']['Row'];

export { supabase };

// Types for API responses
export type UserRole = 'conductor' | 'passenger' | 'admin';
export type BusStatus = 'active' | 'inactive' | 'maintenance';

// Validation functions
export const validateCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const validateSpeed = (speed: number): boolean => {
  return speed >= 0 && speed <= 200; // Max reasonable speed in km/h
};

// Rate limiting for location updates
export class LocationUpdateThrottle {
  private lastUpdate = 0;
  private readonly minInterval = 5000; // 5 seconds

  canUpdate(): boolean {
    const now = Date.now();
    if (now - this.lastUpdate >= this.minInterval) {
      this.lastUpdate = now;
      return true;
    }
    return false;
  }
}