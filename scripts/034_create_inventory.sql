-- Inventory: what is left at the end of a season, so nothing gets bought twice.
--
-- Replaces the unused `public.inventory` table from the original scaffold
-- (001_create_tables.sql). Nothing ever rendered it — app/tables/page.tsx uses
-- TablesClient — and its shape was wrong for this: no photos, no year, and an
-- integer quantity for things you only ever eyeball.

drop table if exists public.inventory cascade;

-- Shelf shots. The primary record: photograph the shelf, type nothing.
create table if not exists public.inventory_photos (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  category text not null check (category in ('kozmetika','hrana','pice','ciscenje','kucanstvo','ostalo')),
  url text not null,
  thumb_url text,
  caption text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Named items. Optional, added at leisure — the index over the photos.
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  category text not null check (category in ('kozmetika','hrana','pice','ciscenje','kucanstvo','ostalo')),
  name text not null,
  level text not null default 'unknown' check (level in ('full','half','low','out','unknown')),
  location text,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_photos_year on public.inventory_photos(year, category, sort_order);
create index if not exists idx_inventory_items_year on public.inventory_items(year, category, sort_order);

alter table public.inventory_photos enable row level security;
alter table public.inventory_items enable row level security;

drop policy if exists "Users can view inventory photos" on public.inventory_photos;
create policy "Users can view inventory photos" on public.inventory_photos
  for select using (true);

drop policy if exists "Users can create inventory photos" on public.inventory_photos;
create policy "Users can create inventory photos" on public.inventory_photos
  for insert with check (true);

drop policy if exists "Users can update inventory photos" on public.inventory_photos;
create policy "Users can update inventory photos" on public.inventory_photos
  for update using (true);

drop policy if exists "Users can delete inventory photos" on public.inventory_photos;
create policy "Users can delete inventory photos" on public.inventory_photos
  for delete using (true);

drop policy if exists "Users can view inventory items" on public.inventory_items;
create policy "Users can view inventory items" on public.inventory_items
  for select using (true);

drop policy if exists "Users can create inventory items" on public.inventory_items;
create policy "Users can create inventory items" on public.inventory_items
  for insert with check (true);

drop policy if exists "Users can update inventory items" on public.inventory_items;
create policy "Users can update inventory items" on public.inventory_items
  for update using (true);

drop policy if exists "Users can delete inventory items" on public.inventory_items;
create policy "Users can delete inventory items" on public.inventory_items
  for delete using (true);

insert into storage.buckets (id, name, public)
values ('inventory-photos', 'inventory-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can view inventory files" on storage.objects;
create policy "Users can view inventory files" on storage.objects
  for select using (bucket_id = 'inventory-photos');

drop policy if exists "Users can upload inventory files" on storage.objects;
create policy "Users can upload inventory files" on storage.objects
  for insert with check (bucket_id = 'inventory-photos');

drop policy if exists "Users can update inventory files" on storage.objects;
create policy "Users can update inventory files" on storage.objects
  for update using (bucket_id = 'inventory-photos');

drop policy if exists "Users can delete inventory files" on storage.objects;
create policy "Users can delete inventory files" on storage.objects
  for delete using (bucket_id = 'inventory-photos');

-- Realtime. The existing tables were enabled by hand in the Supabase dashboard,
-- which is why no earlier migration mentions the publication — easy to forget
-- for a new table, and the failure is silent (the subscription simply never
-- fires). Doing it here instead. Guarded, because adding a table twice errors.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'inventory_photos'
  ) then
    alter publication supabase_realtime add table public.inventory_photos;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'inventory_items'
  ) then
    alter publication supabase_realtime add table public.inventory_items;
  end if;
exception
  when undefined_object then null; -- publication absent on this project; ignore
end $$;
