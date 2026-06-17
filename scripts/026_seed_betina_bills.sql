-- Seed bills for Betina property from payment receipts (BE 2/ folder)
-- Note: Betina-HEP-2024-02-20250318.pdf was empty/unreadable and is excluded
-- Note: HRT-2025-11 receipt (19.12.2025) covers months 08+11+12 in one payment (31.97 EUR)
-- Note: HRT-2025-09 receipt (21.53 EUR) appears to cover 2 months despite label "2025.09"
-- Note: KomunalnaNaknada receipts each cover 2 months; due_date is the first month of the pair

INSERT INTO public.bills (name, amount, due_date, paid, category, recurring)
VALUES
  -- HEP Elektra (electricity)
  ('HEP', 16.00,  '2025-04-01', true, 'utilities', true),
  ('HEP', 37.84,  '2025-06-01', true, 'utilities', true),
  ('HEP', 110.00, '2025-08-01', true, 'utilities', true),

  -- HRT (TV/radio licence fee)
  ('HRT', 10.62, '2025-01-01', true, 'utilities', true),
  ('HRT', 10.62, '2025-03-01', true, 'utilities', true),
  ('HRT', 10.62, '2025-04-01', true, 'utilities', true),
  ('HRT', 10.62, '2025-05-01', true, 'utilities', true),
  ('HRT', 10.62, '2025-06-01', true, 'utilities', true),
  ('HRT', 10.62, '2025-07-01', true, 'utilities', true),
  ('HRT', 21.53, '2025-09-01', true, 'utilities', true),
  ('HRT', 10.62, '2025-10-01', true, 'utilities', true),
  ('HRT', 31.97, '2025-11-01', true, 'utilities', true), -- bundle: months 08+11+12
  ('HRT', 10.78, '2025-08-01', true, 'utilities', true), -- separate receipt paid 02.01.2026

  -- Komunalna naknada (municipal utility fee, Općina Tisno)
  ('Komunalna naknada', 22.98, '2025-01-01', true, 'utilities', true), -- covers Jan+Feb
  ('Komunalna naknada', 22.98, '2025-03-01', true, 'utilities', true), -- covers Mar+Apr
  ('Komunalna naknada', 22.98, '2025-05-01', true, 'utilities', true)  -- covers May+Jun

ON CONFLICT DO NOTHING;
