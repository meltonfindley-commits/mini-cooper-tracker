ALTER TABLE public.tasks RENAME TO services;
ALTER TABLE public.services RENAME COLUMN task TO service;
