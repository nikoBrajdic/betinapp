-- Split the electricity meter into the two physical counter rows
-- Run this in Supabase SQL Editor

UPDATE public.utilities
SET name = 'Struja 1'
WHERE lower(name) = 'struja'
  AND NOT EXISTS (
    SELECT 1 FROM public.utilities existing
    WHERE lower(existing.name) = 'struja 1'
  );

UPDATE public.utility_readings
SET type = 'Struja 1'
WHERE lower(type) = 'struja';

INSERT INTO public.utilities (name, current_usage, max_usage, cost, unit, trend)
SELECT 'Struja 2', 0, 200000, 0, 'kWh', 'stable'
WHERE NOT EXISTS (
  SELECT 1 FROM public.utilities
  WHERE lower(name) = 'struja 2'
);

INSERT INTO public.utilities (name, current_usage, max_usage, cost, unit, trend)
SELECT 'Struja 1', 0, 200000, 0, 'kWh', 'stable'
WHERE NOT EXISTS (
  SELECT 1 FROM public.utilities
  WHERE lower(name) = 'struja 1'
);
