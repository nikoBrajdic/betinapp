-- Create diary entries table and image storage
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_title ON public.diary_entries(title);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_by_id ON public.diary_entries(created_by_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_updated_at ON public.diary_entries(updated_at);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all diary entries" ON public.diary_entries;
CREATE POLICY "Users can view all diary entries" ON public.diary_entries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create diary entries" ON public.diary_entries;
CREATE POLICY "Users can create diary entries" ON public.diary_entries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update diary entries" ON public.diary_entries;
CREATE POLICY "Users can update diary entries" ON public.diary_entries
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete diary entries" ON public.diary_entries;
CREATE POLICY "Users can delete diary entries" ON public.diary_entries
  FOR DELETE USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('diary-images', 'diary-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can view diary images" ON storage.objects;
CREATE POLICY "Users can view diary images" ON storage.objects
  FOR SELECT USING (bucket_id = 'diary-images');

DROP POLICY IF EXISTS "Users can upload diary images" ON storage.objects;
CREATE POLICY "Users can upload diary images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'diary-images');

DROP POLICY IF EXISTS "Users can update diary images" ON storage.objects;
CREATE POLICY "Users can update diary images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'diary-images');

DROP POLICY IF EXISTS "Users can delete diary images" ON storage.objects;
CREATE POLICY "Users can delete diary images" ON storage.objects
  FOR DELETE USING (bucket_id = 'diary-images');
