-- Add split strategy metadata for utility bills
alter table public.bills
  add column if not exists split_preset text not null default 'default',
  add column if not exists split_weights jsonb not null default '{}'::jsonb;

