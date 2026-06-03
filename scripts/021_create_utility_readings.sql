-- Create utility readings log
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.utility_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  value numeric NOT NULL,
  max_value numeric NOT NULL DEFAULT 0,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utility_readings_type ON public.utility_readings(type);
CREATE INDEX IF NOT EXISTS idx_utility_readings_date ON public.utility_readings(date);

ALTER TABLE public.utility_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view utility readings" ON public.utility_readings;
CREATE POLICY "Users can view utility readings" ON public.utility_readings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create utility readings" ON public.utility_readings;
CREATE POLICY "Users can create utility readings" ON public.utility_readings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update utility readings" ON public.utility_readings;
CREATE POLICY "Users can update utility readings" ON public.utility_readings
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete utility readings" ON public.utility_readings;
CREATE POLICY "Users can delete utility readings" ON public.utility_readings
  FOR DELETE USING (true);

INSERT INTO public.utility_readings (type, value, max_value, date)
SELECT name, current_usage, max_usage, updated_at
FROM public.utilities
WHERE NOT EXISTS (
  SELECT 1
  FROM public.utility_readings
  WHERE utility_readings.type = utilities.name
);
