-- Drop the season-closing photo feature.
--
-- Added in 032 on the assumption that closing steps wanted photographic proof.
-- In practice nobody photographs a closed shutter — the checkbox already says
-- it was done — so the column, the bucket and its policies are dead weight.
-- Inventory is where photographs actually earn their place.

alter table public.season_tasks drop column if exists photo_url;

drop policy if exists "Users can view season photos" on storage.objects;
drop policy if exists "Users can upload season photos" on storage.objects;
drop policy if exists "Users can update season photos" on storage.objects;
drop policy if exists "Users can delete season photos" on storage.objects;

delete from storage.objects where bucket_id = 'season-photos';
delete from storage.buckets where id = 'season-photos';
