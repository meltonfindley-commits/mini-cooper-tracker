-- Phase 3: User-scoped RLS + NOT NULL on user_id
-- Run in Supabase Dashboard → SQL Editor AFTER deploying the new edge functions.
-- Deploying edge functions first ensures no window where old app code would
-- fail to write user_id before NOT NULL is enforced.

-- ─── Step 1: Drop legacy public-read policies ─────────────────────────────────
-- These were placeholder policies for the single-user era.

DROP POLICY IF EXISTS "vehicles_read_public"  ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_write_blocked" ON public.vehicles;
DROP POLICY IF EXISTS "tasks_read_public"     ON public.services;
DROP POLICY IF EXISTS "fuel_logs_read_public" ON public.fuel_logs;

-- ─── Step 2: User-scoped SELECT policies ─────────────────────────────────────
-- Each user sees only rows they own. The OR clause is a Tier 3 hook — once
-- team membership is added, extend these with:
--   OR EXISTS (SELECT 1 FROM team_members WHERE ...)

CREATE POLICY "vehicles_select_own"
  ON public.vehicles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "services_select_own"
  ON public.services FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "fuel_logs_select_own"
  ON public.fuel_logs FOR SELECT
  USING (user_id = auth.uid());

-- ─── Step 3: Enforce NOT NULL on user_id ─────────────────────────────────────
-- Safe now that edge functions stamp user_id on every write.

ALTER TABLE public.vehicles  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.services  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.fuel_logs ALTER COLUMN user_id SET NOT NULL;
