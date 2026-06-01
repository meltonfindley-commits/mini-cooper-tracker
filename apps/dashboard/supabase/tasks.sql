-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.tasks (
  id         bigint primary key generated always as identity,
  category   text not null,
  task       text not null,
  priority   text not null default 'Medium',
  status     text not null default 'Not Started',
  cost       text,
  notes      text,
  created_at timestamptz default now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_read_public"
  ON public.tasks FOR SELECT USING (true);

CREATE POLICY "tasks_write_blocked"
  ON public.tasks FOR ALL USING (false) WITH CHECK (false);
