-- Add event_id field to guest_stays table to link with calendar events
-- Run this in Supabase SQL Editor

ALTER TABLE public.guest_stays 
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_guest_stays_event_id ON public.guest_stays(event_id);
