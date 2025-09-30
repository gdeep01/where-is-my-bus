-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('conductor', 'passenger', 'admin');

-- Create enum for bus status
CREATE TYPE public.bus_status AS ENUM ('active', 'inactive', 'maintenance');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'passenger',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create buses table
CREATE TABLE public.buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_number TEXT NOT NULL UNIQUE,
  route_name TEXT NOT NULL,
  conductor_id UUID REFERENCES public.profiles(id),
  status public.bus_status NOT NULL DEFAULT 'inactive',
  capacity INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  conductor_id UUID NOT NULL REFERENCES public.profiles(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  total_distance DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bus_locations table
CREATE TABLE public.bus_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  speed DECIMAL(5, 2) DEFAULT 0,
  heading DECIMAL(5, 2),
  accuracy DECIMAL(5, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_locations ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for buses
CREATE POLICY "Anyone can view buses" ON public.buses
  FOR SELECT USING (true);

CREATE POLICY "Conductors can update assigned buses" ON public.buses
  FOR UPDATE USING (
    auth.uid() = conductor_id OR 
    public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can insert buses" ON public.buses
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete buses" ON public.buses
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for trips
CREATE POLICY "Anyone can view trips" ON public.trips
  FOR SELECT USING (true);

CREATE POLICY "Conductors can create their own trips" ON public.trips
  FOR INSERT WITH CHECK (
    auth.uid() = conductor_id OR 
    public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Conductors can update their own trips" ON public.trips
  FOR UPDATE USING (
    auth.uid() = conductor_id OR 
    public.get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for bus_locations
CREATE POLICY "Anyone can view bus locations" ON public.bus_locations
  FOR SELECT USING (true);

CREATE POLICY "Conductors can insert locations for their buses" ON public.bus_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buses 
      WHERE id = bus_id AND conductor_id = auth.uid()
    ) OR public.get_user_role(auth.uid()) = 'admin'
  );

-- Create indexes for performance
CREATE INDEX idx_buses_conductor_id ON public.buses(conductor_id);
CREATE INDEX idx_buses_status ON public.buses(status);
CREATE INDEX idx_trips_bus_id ON public.trips(bus_id);
CREATE INDEX idx_trips_conductor_id ON public.trips(conductor_id);
CREATE INDEX idx_trips_active ON public.trips(is_active);
CREATE INDEX idx_bus_locations_bus_id ON public.bus_locations(bus_id);
CREATE INDEX idx_bus_locations_timestamp ON public.bus_locations(timestamp);
CREATE INDEX idx_bus_locations_trip_id ON public.bus_locations(trip_id);

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'passenger')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buses_updated_at
  BEFORE UPDATE ON public.buses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.buses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;