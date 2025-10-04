-- Secure trips table RLS to prevent public manipulation
-- 1) Drop ALL existing policies on trips table
DROP POLICY IF EXISTS "Anyone can create trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can update trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can view trips" ON public.trips;
DROP POLICY IF EXISTS "Conductors can create trips" ON public.trips;
DROP POLICY IF EXISTS "Conductors can view own trips" ON public.trips;
DROP POLICY IF EXISTS "Conductors can update own trips" ON public.trips;
DROP POLICY IF EXISTS "Admins can view all trips" ON public.trips;
DROP POLICY IF EXISTS "Admins can update all trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can create their own trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can view trips" ON public.trips;
DROP POLICY IF EXISTS "Public can view active trips" ON public.trips;

-- 2) Create strict policies
-- Only authenticated conductors can create trips for themselves
CREATE POLICY "Conductors can create trips"
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = conductor_id
  AND public.get_user_role(auth.uid()) = 'conductor'::public.user_role
);

-- Conductors can view only their own trips
CREATE POLICY "Conductors can view own trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  auth.uid() = conductor_id
);

-- Conductors can update only their own trips
CREATE POLICY "Conductors can update own trips"
ON public.trips
FOR UPDATE
TO authenticated
USING (
  auth.uid() = conductor_id
  AND public.get_user_role(auth.uid()) = 'conductor'::public.user_role
)
WITH CHECK (
  auth.uid() = conductor_id
  AND public.get_user_role(auth.uid()) = 'conductor'::public.user_role
);

-- Admins can view all trips
CREATE POLICY "Admins can view all trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin'::public.user_role
);

-- Admins can update all trips
CREATE POLICY "Admins can update all trips"
ON public.trips
FOR UPDATE
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin'::public.user_role
)
WITH CHECK (
  public.get_user_role(auth.uid()) = 'admin'::public.user_role
);