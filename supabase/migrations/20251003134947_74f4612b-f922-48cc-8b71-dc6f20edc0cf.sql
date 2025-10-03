-- Enable realtime for bus locations and buses tables safely
-- Ensure full row data is available for updates (good practice for realtime)
DO $$ BEGIN
  ALTER TABLE public.bus_locations REPLICA IDENTITY FULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.buses REPLICA IDENTITY FULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- Add tables to the realtime publication (idempotent with exception handling)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_locations;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.buses;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- Trips can also benefit from realtime, add if not already present
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
