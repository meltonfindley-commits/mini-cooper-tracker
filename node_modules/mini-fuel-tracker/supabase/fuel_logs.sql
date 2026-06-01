-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id            bigint primary key generated always as identity,
  date          date not null,
  odometer      numeric(10,1) not null,
  fuel_amount   numeric(6,3) not null,
  fuel_cost     numeric(8,2),
  price_per_gal numeric(6,3),
  location      text,
  notes         text,
  created_at    timestamptz default now()
);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_logs_read_public"
  ON public.fuel_logs FOR SELECT USING (true);

CREATE POLICY "fuel_logs_write_blocked"
  ON public.fuel_logs FOR ALL USING (false) WITH CHECK (false);
