-- Add stops column to buses table to store intermediate stops
ALTER TABLE public.buses 
ADD COLUMN stops text[] DEFAULT '{}';

-- Add a comment to explain the column
COMMENT ON COLUMN public.buses.stops IS 'Array of intermediate stops between from_destination and to_destination';

-- Create an index for better search performance on stops
CREATE INDEX idx_buses_stops ON public.buses USING GIN (stops);