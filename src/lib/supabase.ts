import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey !== 'your_supabase_anon_key');

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured. Using mock data for demonstration.');
  console.warn('📝 To enable real database: Click "Supabase" button in settings to set up your database.');
}

// Create Supabase client with fallback
export const supabase = createClient(
  supabaseUrl || 'https://demo.supabase.co', 
  supabaseAnonKey || 'demo-key',
  {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: false,
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