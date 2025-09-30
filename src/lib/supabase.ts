import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if environment variables are properly set
if (supabaseUrl === 'https://placeholder.supabase.co' || 
    supabaseAnonKey === 'placeholder-key') {
  console.warn('⚠️ Using default Supabase credentials. Please update your .env file with actual Supabase project credentials.');
  console.warn('📝 Instructions: Click the "Supabase" button in settings to set up your database, then update the .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: false,
  },
  global: {
    fetch: (url, options = {}) => {
      // Prevent actual network calls when using placeholder credentials
      if (supabaseUrl === 'https://placeholder.supabase.co') {
        return Promise.reject(new Error('Supabase not configured'));
      }
      return fetch(url, options);
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