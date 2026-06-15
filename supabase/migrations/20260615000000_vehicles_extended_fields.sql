-- Add structured vehicle metadata columns
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS year          integer,
  ADD COLUMN IF NOT EXISTS make          text,
  ADD COLUMN IF NOT EXISTS model         text,
  ADD COLUMN IF NOT EXISTS trim_level    text,
  ADD COLUMN IF NOT EXISTS color         text,
  ADD COLUMN IF NOT EXISTS original_mileage numeric(10,1),
  ADD COLUMN IF NOT EXISTS current_mileage  numeric(10,1);
