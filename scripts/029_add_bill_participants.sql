-- Add payer/split metadata to utility bills
alter table public.bills
  add column if not exists paid_by text not null default 'Mama',
  add column if not exists split_between text[] not null default '{}';
