-- Migrate notes.content from text to jsonb (Block[] format, same as diary_entries)
-- Skip if already jsonb
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'content') = 'text' THEN
    ALTER TABLE public.notes
      ALTER COLUMN content TYPE jsonb
      USING CASE
        WHEN content::text ~ '^\s*\[' THEN content::text::jsonb
        ELSE '[]'::jsonb
      END;
  END IF;
END $$;

ALTER TABLE public.notes ALTER COLUMN content SET DEFAULT '[]'::jsonb;

-- Storage bucket for note images (mirrors diary-images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes-images', 'notes-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can view note images" ON storage.objects;
CREATE POLICY "Users can view note images" ON storage.objects
  FOR SELECT USING (bucket_id = 'notes-images');

DROP POLICY IF EXISTS "Users can upload note images" ON storage.objects;
CREATE POLICY "Users can upload note images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'notes-images');

DROP POLICY IF EXISTS "Users can update note images" ON storage.objects;
CREATE POLICY "Users can update note images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'notes-images');

DROP POLICY IF EXISTS "Users can delete note images" ON storage.objects;
CREATE POLICY "Users can delete note images" ON storage.objects
  FOR DELETE USING (bucket_id = 'notes-images');
