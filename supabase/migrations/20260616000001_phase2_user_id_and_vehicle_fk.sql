-- Phase 2: user_id ownership columns + integer vehicle FK + cost type fix
-- Run in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all statements are idempotent)
-- Does NOT change RLS policies or edge functions — app works unchanged.
--
-- Intentionally deferred to Phase 3:
--   • NOT NULL constraint on user_id (edge functions don't pass it yet)
--   • Dropping the text `vehicle` column (app still reads it)
--   • RLS policy swap from public-read to user-scoped

-- ─── Step 1: Add user_id to all three tables (nullable) ──────────────────────

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.fuel_logs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

-- ─── Step 2: Add vehicle_id integer FK to services and fuel_logs ─────────────
-- Replaces the text `vehicle` column as the real FK. Text column kept for now.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS vehicle_id bigint REFERENCES public.vehicles (id) ON DELETE SET NULL;

ALTER TABLE public.fuel_logs
  ADD COLUMN IF NOT EXISTS vehicle_id bigint REFERENCES public.vehicles (id) ON DELETE SET NULL;

-- ─── Step 3: Backfill user_id and vehicle_id for all existing rows ────────────

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in auth.users. Complete Phase 1 Step 3 first.';
  END IF;

  -- Backfill user_id on every existing row
  UPDATE public.vehicles  SET user_id = v_user_id WHERE user_id IS NULL;
  UPDATE public.services  SET user_id = v_user_id WHERE user_id IS NULL;
  UPDATE public.fuel_logs SET user_id = v_user_id WHERE user_id IS NULL;

  -- Backfill vehicle_id on services by matching the text vehicle name
  UPDATE public.services s
  SET    vehicle_id = v.id
  FROM   public.vehicles v
  WHERE  s.vehicle   = v.name
    AND  s.vehicle_id IS NULL
    AND  s.vehicle    IS NOT NULL;

  -- Backfill vehicle_id on fuel_logs by matching the text vehicle name
  UPDATE public.fuel_logs l
  SET    vehicle_id = v.id
  FROM   public.vehicles v
  WHERE  l.vehicle   = v.name
    AND  l.vehicle_id IS NULL
    AND  l.vehicle    IS NOT NULL;

  RAISE NOTICE 'Backfill complete for user %', v_user_id;
END;
$$;

-- ─── Step 4: Fix services.cost — text → numeric ───────────────────────────────
-- NULLIF + TRIM converts empty strings and whitespace to NULL safely.

ALTER TABLE public.services
  ALTER COLUMN cost TYPE numeric(10,2)
  USING NULLIF(TRIM(COALESCE(cost, '')), '')::numeric;

-- ─── Step 5: Replace global name uniqueness with per-user uniqueness ──────────
-- Old constraint prevents two users having a vehicle with the same name.

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_name_key;

-- Partial unique index: enforced only when user_id is set.
-- Allows the nullable period during migration without spurious conflicts.
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_user_id_name_key
  ON public.vehicles (user_id, name)
  WHERE user_id IS NOT NULL;

-- ─── Step 6: Indexes for RLS query performance ───────────────────────────────
-- Every future SELECT will filter by user_id — these make that fast.

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id  ON public.vehicles  (user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id  ON public.services  (user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_user_id ON public.fuel_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_services_vehicle_id  ON public.services  (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_id ON public.fuel_logs (vehicle_id);
