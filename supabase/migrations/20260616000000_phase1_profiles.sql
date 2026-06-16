-- Phase 1: Supabase Auth foundation
-- Run in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all statements are idempotent)
-- Does NOT touch existing tables. App continues to work unchanged.

-- ─── profiles table ──────────────────────────────────────────────────────────
-- Extends auth.users with display name and future plan/avatar fields.
-- id mirrors auth.users(id) 1:1 — no separate PK sequence needed.

CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Each user can only see and edit their own profile row.
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service role (edge functions) can insert profiles on behalf of new users.
CREATE POLICY "profiles_insert_service"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─── Auto-create profile on signup ───────────────────────────────────────────
-- Fires after every new row in auth.users. Seeds display_name from email
-- prefix (e.g. "klafleh@gmail.com" → "klafleh") as a sensible default.
-- The user can update it later in account settings.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger first so this file is safe to re-run.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Backfill: create a profile for any auth users that already exist ─────────
-- Safe no-op if auth.users is empty (which it likely is at this point).
INSERT INTO public.profiles (id, display_name)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
