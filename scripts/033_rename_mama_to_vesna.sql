-- Rename the household payer from "Mama" to "Vesna", and put the Internet
-- bills on the rule they actually follow: always three ways between Niko,
-- Matea and Vesna (the three couples), regardless of who was staying.
--
-- Already applied to production on 2026-09-09. Kept for the record and for
-- rebuilding the database from scratch.

update public.bills
set paid_by = 'Vesna'
where paid_by = 'Mama';

update public.bills
set split_between = array_replace(split_between, 'Mama', 'Vesna')
where 'Mama' = any(split_between);

update public.bills
set split_preset = 'equal',
    split_between = array['Niko', 'Matea', 'Vesna']
where name = 'Internet';
