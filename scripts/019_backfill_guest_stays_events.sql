-- Backfill existing guest stays with calendar events
-- Run this in Supabase SQL Editor

-- Insert events for existing guest stays that don't have an event_id
INSERT INTO public.events (title, description, start_date, end_date, time, category, created_at, updated_at)
SELECT 
  guest_name || ' - ' || room as title,
  'Guest stay in ' || room || CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\nNotes: ' || notes ELSE '' END as description,
  from_date as start_date,
  to_date as end_date,
  NULL as time,
  'other' as category,
  created_at,
  updated_at
FROM public.guest_stays 
WHERE event_id IS NULL;

-- Update guest_stays with the newly created event IDs
UPDATE public.guest_stays 
SET event_id = events.id
FROM public.events 
WHERE guest_stays.event_id IS NULL 
  AND events.title = guest_stays.guest_name || ' - ' || guest_stays.room
  AND events.start_date = guest_stays.from_date
  AND events.end_date = guest_stays.to_date
  AND events.category = 'other';
