-- Create notes table
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  color text not null default 'blue',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date not null,
  time text not null,
  category text not null default 'other' check (category in ('appointment', 'maintenance', 'social', 'other')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create utilities table
create table if not exists public.utilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  current_usage numeric not null default 0,
  max_usage numeric not null,
  cost numeric not null default 0,
  unit text not null,
  trend text not null default 'stable' check (trend in ('up', 'down', 'stable')),
  updated_at timestamptz default now()
);

-- Create bills table
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  category text not null default 'other' check (category in ('utilities', 'rent', 'insurance', 'subscription', 'other')),
  recurring boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create inventory table
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  location text not null,
  quantity integer not null default 1,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create guest_stays table
create table if not exists public.guest_stays (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  room text not null,
  check_in date not null,
  check_out date not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'current', 'past')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better query performance
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_events_date on public.events(date);
create index if not exists idx_bills_due_date on public.bills(due_date);
create index if not exists idx_bills_status on public.bills(status);
create index if not exists idx_guest_stays_status on public.guest_stays(status);
create index if not exists idx_guest_stays_check_in on public.guest_stays(check_in);
