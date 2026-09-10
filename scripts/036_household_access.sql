-- Apply once before deploying the reliability branch. See PUBLISHING.md.
-- Replaces permissive policies, preserving existing approved family accounts.
begin;

-- Abort rather than accidentally leaving a household with no administrator.
do $$
begin
  if not exists (
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    join public.allowlist a on lower(a.email) = lower(u.email)
    where p.role = 'superadmin'
  ) then
    raise exception 'Confirm an allowlisted superadmin profile before applying migration 036';
  end if;
end $$;

create or replace function public.is_household_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    join public.allowlist a on lower(a.email) = lower(u.email)
    where p.id = auth.uid()
  );
$$;

create or replace function public.is_household_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_household_member() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'
  );
$$;

-- Use the verified Auth email, never a profile field editable by the user.
create or replace function public.household_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(email) from auth.users where id = auth.uid();
$$;

revoke all on function public.is_household_member(), public.is_household_admin(), public.household_email() from public;
grant execute on function public.is_household_member(), public.is_household_admin(), public.household_email() to authenticated;

-- Remove ALL old policies on these app tables: permissive policies combine
-- with OR, so adding a restrictive-looking policy alone would not close access.
do $$
declare tab text; pol record;
begin
  foreach tab in array array['notes','tasks','task_groups','events','utilities',
    'utility_readings','bills','bill_shares','guest_stays','tables','diary_entries',
    'note_documents','season_closings','season_tasks','inventory_photos',
    'inventory_items','profiles','allowlist','join_requests','invites'] loop
    if to_regclass(format('public.%I', tab)) is null then continue; end if;
    execute format('alter table public.%I enable row level security', tab);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tab loop
      execute format('drop policy %I on public.%I', pol.policyname, tab);
    end loop;
    if tab not in ('profiles','allowlist','join_requests','invites') then
      execute format('create policy "Household members" on public.%I for all to authenticated using ((select public.is_household_member())) with check ((select public.is_household_member()))', tab);
    end if;
  end loop;
end $$;

create policy "Read household profiles" on public.profiles for select to authenticated
  using ((select public.is_household_member()));
create policy "Admins update profiles" on public.profiles for update to authenticated
  using ((select public.is_household_admin())) with check ((select public.is_household_admin()));

create policy "Read own allowlist entry or household" on public.allowlist for select to authenticated
  using (lower(email) = (select public.household_email()) or (select public.is_household_member()));
create policy "Admins manage allowlist" on public.allowlist for all to authenticated
  using ((select public.is_household_admin())) with check ((select public.is_household_admin()));

create policy "Read own join request or admin" on public.join_requests for select to authenticated
  using (lower(email) = (select public.household_email()) or (select public.is_household_admin()));
create policy "Submit own pending request" on public.join_requests for insert to authenticated
  with check (lower(email) = (select public.household_email()) and status = 'pending'
    and reviewed_by_id is null and exists (
      select 1 from public.allowlist a where lower(a.email) = (select public.household_email())
    ));
create policy "Admins update join requests" on public.join_requests for update to authenticated
  using ((select public.is_household_admin())) with check ((select public.is_household_admin()));
create policy "Admins delete join requests" on public.join_requests for delete to authenticated
  using ((select public.is_household_admin()));
create policy "Admins manage invites" on public.invites for all to authenticated
  using ((select public.is_household_admin())) with check ((select public.is_household_admin()));

-- OAuth account creation must not itself grant household membership.
drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.complete_household_signup()
returns void language plpgsql security definer set search_path = '' as $$
declare u auth.users;
begin
  select * into u from auth.users where id = auth.uid();
  if u.id is null or not exists (
    select 1 from public.allowlist a where lower(a.email) = lower(u.email)
  ) or not exists (
    select 1 from public.join_requests j where lower(j.email) = lower(u.email) and j.status = 'approved'
  ) then raise exception 'Household approval required' using errcode = '42501'; end if;
  insert into public.profiles (id, email, full_name, role)
  values (u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 'superadmin')
  on conflict (id) do nothing;
end $$;
revoke all on function public.complete_household_signup() from public;
grant execute on function public.complete_household_signup() to authenticated;

-- Restrict listing/uploads/updates/deletes in app-owned buckets. Existing
-- public image URLs stay readable; making them private needs URL migration.
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and (coalesce(qual, '') || coalesce(with_check, '')) ~ '(diary-images|notes-images|notes-documents|inventory-photos)'
  loop execute format('drop policy %I on storage.objects', pol.policyname); end loop;
end $$;
create policy "Household app files" on storage.objects for all to authenticated
  using (bucket_id in ('diary-images','notes-images','notes-documents','inventory-photos') and (select public.is_household_member()))
  with check (bucket_id in ('diary-images','notes-images','notes-documents','inventory-photos') and (select public.is_household_member()));

commit;
