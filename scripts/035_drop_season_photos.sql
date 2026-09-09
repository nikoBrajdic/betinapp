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

-- The bucket itself is left alone. Supabase forbids deleting from
-- storage.objects in SQL (`42501: Direct deletion from storage tables is not
-- allowed`), and since the whole migration runs in one transaction, trying it
-- rolls back the column drop above too. The bucket is empty — nothing was ever
-- uploaded — so delete it from the Storage page in the dashboard, or leave it.
