-- Seed utilities data
insert into public.utilities (name, current_usage, max_usage, cost, unit, trend) values
  ('Electricity', 450, 600, 89.50, 'kWh', 'up'),
  ('Water', 8500, 12000, 45.20, 'L', 'stable'),
  ('Gas', 120, 200, 67.80, 'm³', 'down'),
  ('Internet', 850, 1000, 59.99, 'GB', 'up')
on conflict do nothing;

-- Seed sample notes
insert into public.notes (title, content, color) values
  ('Grocery List', 'Milk, Eggs, Bread, Butter, Coffee', 'blue'),
  ('Home Maintenance', 'Fix leaky faucet in bathroom, Replace air filter', 'yellow'),
  ('Weekend Plans', 'Visit farmers market, Movie night with family', 'green')
on conflict do nothing;

-- Seed sample tasks
insert into public.tasks (title, description, status, priority, due_date) values
  ('Pay electricity bill', 'Due by end of month', 'todo', 'high', current_date + interval '5 days'),
  ('Schedule HVAC maintenance', 'Annual checkup needed', 'todo', 'medium', current_date + interval '10 days'),
  ('Organize garage', 'Sort and donate unused items', 'in-progress', 'low', current_date + interval '15 days')
on conflict do nothing;

-- Seed sample events
insert into public.events (title, description, date, time, category) values
  ('HVAC Maintenance', 'Annual HVAC system checkup', current_date + interval '3 days', '10:00', 'maintenance'),
  ('Doctor Appointment', 'Annual checkup with Dr. Smith', current_date + interval '6 days', '14:30', 'appointment')
on conflict do nothing;

-- Seed sample bills
insert into public.bills (name, amount, due_date, status, category, recurring) values
  ('Electricity', 89.50, current_date + interval '5 days', 'pending', 'utilities', true),
  ('Internet', 59.99, current_date + interval '10 days', 'pending', 'utilities', true),
  ('Home Insurance', 125.00, current_date + interval '15 days', 'pending', 'insurance', true)
on conflict do nothing;

-- Seed sample inventory
insert into public.inventory (name, category, location, quantity, notes) values
  ('Light Bulbs', 'Hardware', 'Garage', 12, 'LED 60W equivalent'),
  ('Paper Towels', 'Household', 'Pantry', 6, 'Bulk pack'),
  ('Batteries (AA)', 'Electronics', 'Drawer', 24, 'Rechargeable')
on conflict do nothing;

-- Seed sample guest stays
insert into public.guest_stays (guest_name, room, check_in, check_out, status, notes) values
  ('Sarah Johnson', 'Guest Room', current_date + interval '7 days', current_date + interval '10 days', 'upcoming', 'Vegetarian meals'),
  ('Mike & Lisa Chen', 'Master Suite', current_date + interval '20 days', current_date + interval '23 days', 'upcoming', 'Anniversary celebration')
on conflict do nothing;
