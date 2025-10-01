-- Add from and to destination fields to buses table
ALTER TABLE public.buses
ADD COLUMN from_destination text,
ADD COLUMN to_destination text;

-- Update RLS policies to allow public access without authentication
DROP POLICY IF EXISTS "Conductors can update assigned buses" ON public.buses;
DROP POLICY IF EXISTS "Admins can insert buses" ON public.buses;
DROP POLICY IF EXISTS "Admins can delete buses" ON public.buses;

-- Allow anyone to update buses (for conductors to set routes)
CREATE POLICY "Anyone can update buses"
ON public.buses
FOR UPDATE
USING (true);

-- Allow anyone to insert buses
CREATE POLICY "Anyone can insert buses"
ON public.buses
FOR INSERT
WITH CHECK (true);

-- Update trips policies to allow public access
DROP POLICY IF EXISTS "Conductors can create their own trips" ON public.trips;
DROP POLICY IF EXISTS "Conductors can update their own trips" ON public.trips;

CREATE POLICY "Anyone can create trips"
ON public.trips
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update trips"
ON public.trips
FOR UPDATE
USING (true);

-- Update bus_locations policies to allow public access
DROP POLICY IF EXISTS "Conductors can insert locations for their buses" ON public.bus_locations;

CREATE POLICY "Anyone can insert bus locations"
ON public.bus_locations
FOR INSERT
WITH CHECK (true);