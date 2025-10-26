-- Migration script to update schema for new features
-- This script updates the existing tables and adds new ones

-- 1. Update events table to support multi-day events
alter table public.events 
  rename column date to start_date;

alter table public.events 
  add column end_date date;

alter table public.events 
  alter column time drop not null;

-- Update the category check constraint to match our new values
alter table public.events 
  drop constraint if exists events_category_check;

alter table public.events 
  add constraint events_category_check 
  check (category in ('family', 'maintenance', 'appointment', 'other'));

-- 2. Create task_groups table
create table if not exists public.task_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  color text not null default 'blue',
  author_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Update tasks table to work with task groups
-- First, let's backup the existing tasks data by creating a temporary table
create table if not exists public.tasks_backup as 
select * from public.tasks;

-- Drop the old tasks table
drop table if exists public.tasks;

-- Create new tasks table with task group relationship
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  completed boolean not null default false,
  task_group_id uuid references public.task_groups(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Update bills table to support bill sharing
alter table public.bills 
  add column type text not null default 'recurring' check (type in ('recurring', 'metered', 'one-time'));

alter table public.bills 
  add column created_by_id uuid references auth.users(id) on delete cascade;

-- Convert status column to boolean paid column
-- First add a new boolean column
alter table public.bills 
  add column paid boolean not null default false;

-- Update the new column based on existing status values
update public.bills 
  set paid = true 
  where status = 'paid';

-- Drop the old status column
alter table public.bills 
  drop column status;

-- 5. Create bill_shares table
create table if not exists public.bill_shares (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references public.bills(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric not null,
  paid boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Update guest_stays table to match our new schema
alter table public.guest_stays 
  rename column check_in to from_date;

alter table public.guest_stays 
  rename column check_out to to_date;

alter table public.guest_stays 
  add column created_by_id uuid references auth.users(id) on delete cascade;

-- 7. Create allowlist table
create table if not exists public.allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_by_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. Create join_requests table
create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. Create utility_readings table (renamed from utilities for consistency)
create table if not exists public.utility_readings (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  value numeric not null,
  max_value numeric not null,
  date timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. Create indexes for better performance
create index if not exists idx_task_groups_author_id on public.task_groups(author_id);
create index if not exists idx_tasks_task_group_id on public.tasks(task_group_id);
create index if not exists idx_tasks_completed on public.tasks(completed);
create index if not exists idx_events_start_date on public.events(start_date);
create index if not exists idx_events_end_date on public.events(end_date);
create index if not exists idx_bills_type on public.bills(type);
create index if not exists idx_bills_created_by_id on public.bills(created_by_id);
create index if not exists idx_bill_shares_bill_id on public.bill_shares(bill_id);
create index if not exists idx_bill_shares_user_id on public.bill_shares(user_id);
create index if not exists idx_bill_shares_paid on public.bill_shares(paid);
create index if not exists idx_guest_stays_created_by_id on public.guest_stays(created_by_id);
create index if not exists idx_allowlist_email on public.allowlist(email);
create index if not exists idx_allowlist_role on public.allowlist(role);
create index if not exists idx_join_requests_email on public.join_requests(email);
create index if not exists idx_join_requests_status on public.join_requests(status);
create index if not exists idx_utility_readings_type on public.utility_readings(type);
create index if not exists idx_utility_readings_date on public.utility_readings(date);

-- 11. Add foreign key constraints for existing tables
alter table public.notes 
  add column author_id uuid references auth.users(id) on delete cascade;

alter table public.events 
  add column created_by_id uuid references auth.users(id) on delete cascade;

-- 12. Enable RLS on new tables
alter table public.task_groups enable row level security;
alter table public.tasks enable row level security;
alter table public.bill_shares enable row level security;
alter table public.allowlist enable row level security;
alter table public.join_requests enable row level security;
alter table public.utility_readings enable row level security;

-- 13. Create RLS policies for new tables
-- Task groups policies
create policy "Users can view all task groups" on public.task_groups
  for select using (true);

create policy "Users can create task groups" on public.task_groups
  for insert with check (auth.uid() = author_id);

create policy "Users can update their own task groups" on public.task_groups
  for update using (auth.uid() = author_id);

create policy "Users can delete their own task groups" on public.task_groups
  for delete using (auth.uid() = author_id);

-- Tasks policies
create policy "Users can view all tasks" on public.tasks
  for select using (true);

create policy "Users can create tasks" on public.tasks
  for insert with check (true);

create policy "Users can update tasks" on public.tasks
  for update using (true);

create policy "Users can delete tasks" on public.tasks
  for delete using (true);

-- Bill shares policies
create policy "Users can view their own bill shares" on public.bill_shares
  for select using (auth.uid() = user_id);

create policy "Users can create bill shares" on public.bill_shares
  for insert with check (true);

create policy "Users can update their own bill shares" on public.bill_shares
  for update using (auth.uid() = user_id);

create policy "Users can delete their own bill shares" on public.bill_shares
  for delete using (auth.uid() = user_id);

-- Allowlist policies (only superadmins can manage)
create policy "Superadmins can view allowlist" on public.allowlist
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'superadmin'
    )
  );

create policy "Superadmins can manage allowlist" on public.allowlist
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'superadmin'
    )
  );

-- Join requests policies (only superadmins can manage)
create policy "Superadmins can view join requests" on public.join_requests
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'superadmin'
    )
  );

create policy "Superadmins can manage join requests" on public.join_requests
  for all using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'superadmin'
    )
  );

-- Utility readings policies
create policy "Users can view utility readings" on public.utility_readings
  for select using (true);

create policy "Users can create utility readings" on public.utility_readings
  for insert with check (true);

create policy "Users can update utility readings" on public.utility_readings
  for update using (true);

create policy "Users can delete utility readings" on public.utility_readings
  for delete using (true);
