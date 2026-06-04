-- Keep electricity as one visible utility.
-- The two physical counter rows are stored as Struja 1 and Struja 2 readings
-- whenever a Struja reading is logged.

INSERT INTO public.utilities (name, current_usage, max_usage, cost, unit, trend)
SELECT 'Struja', 0, 200000, 0, 'kWh', 'stable'
WHERE NOT EXISTS (
  SELECT 1 FROM public.utilities
  WHERE lower(name) = 'struja'
);
