ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS service_date date;
