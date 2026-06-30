-- Add an optional end month to bills so a single bill can cover a range of
-- whole months (e.g. an offseason bill spanning Jan–May).
-- due_date stays the FIRST day of the start month; period_end is the FIRST day
-- of the end month. NULL period_end means the bill covers a single month.
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS period_end date;
