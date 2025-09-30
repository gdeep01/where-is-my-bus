/*
  # Bus Tracking System Database Schema

  1. New Tables
    - `buses`
      - `id` (uuid, primary key)
      - `bus_number` (text, unique)
      - `route_name` (text)
      - `capacity` (integer)
      - `status` (text, default 'offline')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `trips`
      - `id` (uuid, primary key)
      - `bus_id` (uuid, foreign key)
      - `conductor_name` (text)
      - `start_time` (timestamp)
      - `end_time` (timestamp, nullable)
      - `status` (text, default 'active')
      - `created_at` (timestamp)
    
    - `bus_locations`
      - `id` (uuid, primary key)
      - `bus_id` (uuid, foreign key)
      - `trip_id` (uuid, foreign key)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `speed` (double precision, nullable)
      - `accuracy` (double precision, nullable)
      - `timestamp` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
    - Add policies for authenticated users to manage data
*/

-- Create buses table
CREATE TABLE IF NOT EXISTS buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_number text UNIQUE NOT NULL,
  route_name text NOT NULL,
  capacity integer DEFAULT 50,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES buses(id) ON DELETE CASCADE,
  conductor_name text NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- Create bus_locations table
CREATE TABLE IF NOT EXISTS bus_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES buses(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed double precision,
  accuracy double precision,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for buses
CREATE POLICY "Anyone can read buses"
  ON buses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update buses"
  ON buses
  FOR UPDATE
  TO public
  USING (true);

-- Create policies for trips
CREATE POLICY "Anyone can read trips"
  ON trips
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert trips"
  ON trips
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update trips"
  ON trips
  FOR UPDATE
  TO public
  USING (true);

-- Create policies for bus_locations
CREATE POLICY "Anyone can read bus_locations"
  ON bus_locations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert bus_locations"
  ON bus_locations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_trips_bus_id ON trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_bus_locations_bus_id ON bus_locations(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_locations_trip_id ON bus_locations(trip_id);
CREATE INDEX IF NOT EXISTS idx_bus_locations_timestamp ON bus_locations(timestamp DESC);

-- Insert sample buses for Karnataka
INSERT INTO buses (bus_number, route_name, capacity, status) VALUES
  ('KA-01-AB-1234', 'Bangalore - Mysore', 45, 'offline'),
  ('KA-02-CD-5678', 'Bangalore - Hubli', 50, 'offline'),
  ('KA-03-EF-9012', 'Mysore - Hassan', 40, 'offline'),
  ('KA-04-GH-3456', 'Hubli - Belgaum', 48, 'offline'),
  ('KA-05-IJ-7890', 'Bangalore - Mangalore', 52, 'offline'),
  ('KA-06-KL-2345', 'Gulbarga - Bijapur', 45, 'offline'),
  ('KA-07-MN-6789', 'Shimoga - Davangere', 42, 'offline'),
  ('KA-08-OP-0123', 'Tumkur - Chitradurga', 46, 'offline')
ON CONFLICT (bus_number) DO NOTHING;

-- Create function to update bus status based on recent locations
CREATE OR REPLACE FUNCTION update_bus_status()
RETURNS void AS $$
BEGIN
  -- Mark buses as offline if no location update in last 2 minutes
  UPDATE buses 
  SET status = 'offline', updated_at = now()
  WHERE id NOT IN (
    SELECT DISTINCT bus_id 
    FROM bus_locations 
    WHERE timestamp > now() - interval '2 minutes'
  ) AND status = 'online';
  
  -- Mark buses as online if they have recent location updates
  UPDATE buses 
  SET status = 'online', updated_at = now()
  WHERE id IN (
    SELECT DISTINCT bus_id 
    FROM bus_locations 
    WHERE timestamp > now() - interval '2 minutes'
  ) AND status = 'offline';
END;
$$ LANGUAGE plpgsql;