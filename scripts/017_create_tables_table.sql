-- Create tables table for dining table management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 4 CHECK (capacity > 0),
  location text NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  notes text,
  created_by_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_location ON public.tables(location);
CREATE INDEX IF NOT EXISTS idx_tables_created_by_id ON public.tables(created_by_id);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all tables" ON public.tables
  FOR SELECT USING (true);

CREATE POLICY "Users can create tables" ON public.tables
  FOR INSERT WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "Users can update tables" ON public.tables
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete tables" ON public.tables
  FOR DELETE USING (true);
