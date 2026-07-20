-- Notes documents library (General + Documents split support)
create table if not exists public.note_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_type text not null,
  text_kind text not null check (text_kind in ('plain', 'rich')),
  size_bytes bigint not null check (size_bytes >= 0),
  storage_path text not null,
  created_by uuid references public.profiles(id) on delete set null,
  last_modified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_note_documents_updated_at on public.note_documents(updated_at desc);
create index if not exists idx_note_documents_name on public.note_documents(name);

alter table public.note_documents enable row level security;

drop policy if exists "Users can view note documents" on public.note_documents;
create policy "Users can view note documents" on public.note_documents
  for select using (true);

drop policy if exists "Users can create note documents" on public.note_documents;
create policy "Users can create note documents" on public.note_documents
  for insert with check (true);

drop policy if exists "Users can update note documents" on public.note_documents;
create policy "Users can update note documents" on public.note_documents
  for update using (true);

drop policy if exists "Users can delete note documents" on public.note_documents;
create policy "Users can delete note documents" on public.note_documents
  for delete using (true);

insert into storage.buckets (id, name, public)
values ('notes-documents', 'notes-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can view note documents files" on storage.objects;
create policy "Users can view note documents files" on storage.objects
  for select using (bucket_id = 'notes-documents');

drop policy if exists "Users can upload note documents files" on storage.objects;
create policy "Users can upload note documents files" on storage.objects
  for insert with check (bucket_id = 'notes-documents');

drop policy if exists "Users can update note documents files" on storage.objects;
create policy "Users can update note documents files" on storage.objects
  for update using (bucket_id = 'notes-documents');

drop policy if exists "Users can delete note documents files" on storage.objects;
create policy "Users can delete note documents files" on storage.objects
  for delete using (bucket_id = 'notes-documents');
