import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      buses: {
        Row: {
          id: string;
          bus_number: string;
          route_name: string;
          capacity: number;
          status: 'online' | 'offline';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bus_number: string;
          route_name: string;
          capacity?: number;
          status?: 'online' | 'offline';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bus_number?: string;
          route_name?: string;
          capacity?: number;
          status?: 'online' | 'offline';
          created_at?: string;
          updated_at?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          bus_id: string;
          conductor_name: string;
          start_time: string;
          end_time: string | null;
          status: 'active' | 'completed';
          created_at: string;
        };
        Insert: {
          id?: string;
          bus_id: string;
          conductor_name: string;
          start_time?: string;
          end_time?: string | null;
          status?: 'active' | 'completed';
          created_at?: string;
        };
        Update: {
          id?: string;
          bus_id?: string;
          conductor_name?: string;
          start_time?: string;
          end_time?: string | null;
          status?: 'active' | 'completed';
          created_at?: string;
        };
      };
      bus_locations: {
        Row: {
          id: string;
          bus_id: string;
          trip_id: string;
          latitude: number;
          longitude: number;
          speed: number | null;
          accuracy: number | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bus_id: string;
          trip_id: string;
          latitude: number;
          longitude: number;
          speed?: number | null;
          accuracy?: number | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          bus_id?: string;
          trip_id?: string;
          latitude?: number;
          longitude?: number;
          speed?: number | null;
          accuracy?: number | null;
          timestamp?: string;
          created_at?: string;
        };
      };
    };
  };
};