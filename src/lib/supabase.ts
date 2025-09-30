import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Provide default values for development if environment variables are not set
const defaultUrl = 'https://your-project-id.supabase.co';
const defaultKey = 'your-anon-key-here';

// Use environment variables if available, otherwise use defaults
const finalUrl = supabaseUrl && supabaseUrl !== 'https://your-project-id.supabase.co' ? supabaseUrl : defaultUrl;
const finalKey = supabaseAnonKey && supabaseAnonKey !== 'your-anon-key-here' ? supabaseAnonKey : defaultKey;

// Show warning if using default values
if (finalUrl === defaultUrl || finalKey === defaultKey) {
  console.warn('⚠️ Using default Supabase credentials. Please update your .env file with actual Supabase project credentials.');
  console.warn('📝 Instructions: Click the "Supabase" button in settings to set up your database, then update the .env file.');
}

export const supabase = createClient(finalUrl, finalKey, {
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