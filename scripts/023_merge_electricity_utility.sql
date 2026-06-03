-- Repair databases where electricity was accidentally created as Struja 1/Struja 2
-- utilities. Reading history may keep Struja 1 and Struja 2 as counter details.

INSERT INTO public.utilities (name, current_usage, max_usage, cost, unit, trend, updated_at)
SELECT
  'Struja',
  COALESCE(SUM(current_usage), 0),
  COALESCE(MAX(max_usage), 200000),
  0,
  'kWh',
  'stable',
  COALESCE(MAX(updated_at), NOW())
FROM public.utilities
WHERE lower(name) IN ('struja 1', 'struja 2')
HAVING NOT EXISTS (
  SELECT 1 FROM public.utilities
  WHERE lower(name) = 'struja'
);

UPDATE public.utilities target
SET
  current_usage = source.current_usage,
  max_usage = source.max_usage,
  unit = 'kWh',
  updated_at = source.updated_at
FROM (
  SELECT
    COALESCE(SUM(current_usage), 0) AS current_usage,
    COALESCE(MAX(max_usage), 200000) AS max_usage,
    COALESCE(MAX(updated_at), NOW()) AS updated_at
  FROM public.utilities
  WHERE lower(name) IN ('struja 1', 'struja 2')
) source
WHERE lower(target.name) = 'struja'
  AND EXISTS (
    SELECT 1 FROM public.utilities
    WHERE lower(name) IN ('struja 1', 'struja 2')
  );

DELETE FROM public.utilities
WHERE lower(name) IN ('struja 1', 'struja 2');
