-- Enable Row Level Security on all tables
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.utilities enable row level security;
alter table public.bills enable row level security;
alter table public.inventory enable row level security;
alter table public.guest_stays enable row level security;

-- Create policies for notes (allow all operations for now - can be restricted later with auth)
create policy "Allow all operations on notes" on public.notes for all using (true) with check (true);

-- Create policies for tasks
create policy "Allow all operations on tasks" on public.tasks for all using (true) with check (true);

-- Create policies for events
create policy "Allow all operations on events" on public.events for all using (true) with check (true);

-- Create policies for utilities
create policy "Allow all operations on utilities" on public.utilities for all using (true) with check (true);

-- Create policies for bills
create policy "Allow all operations on bills" on public.bills for all using (true) with check (true);

-- Create policies for inventory
create policy "Allow all operations on inventory" on public.inventory for all using (true) with check (true);

-- Create policies for guest_stays
create policy "Allow all operations on guest_stays" on public.guest_stays for all using (true) with check (true);
