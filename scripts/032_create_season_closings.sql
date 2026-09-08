-- End-of-season closing checklists.
--
-- One list per unit per year, so "Apartman 2026" and "Kuća 2026" are separate
-- and can be worked on independently. Starting a new season copies the previous
-- year's items (unchecked) so the knowledge accumulates instead of being retyped.

create table if not exists public.season_closings (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  unit text not null check (unit in ('apartman', 'kuca', 'garsonjera', 'sok_soba')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, unit)
);

create table if not exists public.season_tasks (
  id uuid primary key default gen_random_uuid(),
  closing_id uuid not null references public.season_closings(id) on delete cascade,
  area text not null,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references public.profiles(id) on delete set null,
  done_by_name text,
  -- Proof: the closed valve, the final meter reading, the locked shutters.
  photo_url text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_season_closings_year on public.season_closings(year desc);
create index if not exists idx_season_tasks_closing on public.season_tasks(closing_id, sort_order);

alter table public.season_closings enable row level security;
alter table public.season_tasks enable row level security;

drop policy if exists "Users can view season closings" on public.season_closings;
create policy "Users can view season closings" on public.season_closings
  for select using (true);

drop policy if exists "Users can create season closings" on public.season_closings;
create policy "Users can create season closings" on public.season_closings
  for insert with check (true);

drop policy if exists "Users can update season closings" on public.season_closings;
create policy "Users can update season closings" on public.season_closings
  for update using (true);

drop policy if exists "Users can delete season closings" on public.season_closings;
create policy "Users can delete season closings" on public.season_closings
  for delete using (true);

drop policy if exists "Users can view season tasks" on public.season_tasks;
create policy "Users can view season tasks" on public.season_tasks
  for select using (true);

drop policy if exists "Users can create season tasks" on public.season_tasks;
create policy "Users can create season tasks" on public.season_tasks
  for insert with check (true);

drop policy if exists "Users can update season tasks" on public.season_tasks;
create policy "Users can update season tasks" on public.season_tasks
  for update using (true);

drop policy if exists "Users can delete season tasks" on public.season_tasks;
create policy "Users can delete season tasks" on public.season_tasks
  for delete using (true);

-- Photos of completed steps.
insert into storage.buckets (id, name, public)
values ('season-photos', 'season-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can view season photos" on storage.objects;
create policy "Users can view season photos" on storage.objects
  for select using (bucket_id = 'season-photos');

drop policy if exists "Users can upload season photos" on storage.objects;
create policy "Users can upload season photos" on storage.objects
  for insert with check (bucket_id = 'season-photos');

drop policy if exists "Users can update season photos" on storage.objects;
create policy "Users can update season photos" on storage.objects
  for update using (bucket_id = 'season-photos');

drop policy if exists "Users can delete season photos" on storage.objects;
create policy "Users can delete season photos" on storage.objects
  for delete using (bucket_id = 'season-photos');
