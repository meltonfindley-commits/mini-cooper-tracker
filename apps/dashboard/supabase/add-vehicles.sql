-- Run in Supabase Dashboard → SQL Editor
-- Migration: add multi-vehicle support to dashboard tasks

-- 1. Add vehicle column to existing tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS vehicle text;

-- 2. Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id         bigint primary key generated always as identity,
  name       text not null unique,
  created_at timestamptz default now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_read_public"
  ON public.vehicles FOR SELECT USING (true);

CREATE POLICY "vehicles_write_blocked"
  ON public.vehicles FOR ALL USING (false) WITH CHECK (false);

-- 3. Seed the default vehicle (safe to run multiple times)
INSERT INTO public.vehicles (name)
VALUES ('2009 Mini Cooper S')
ON CONFLICT (name) DO NOTHING;
