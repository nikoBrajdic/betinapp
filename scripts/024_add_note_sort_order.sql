-- Add persistent manual ordering for note cards.

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS sort_order integer;

WITH ordered_notes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 AS next_sort_order
  FROM public.notes
  WHERE sort_order IS NULL
)
UPDATE public.notes
SET sort_order = ordered_notes.next_sort_order
FROM ordered_notes
WHERE notes.id = ordered_notes.id;

CREATE INDEX IF NOT EXISTS idx_notes_sort_order ON public.notes(sort_order);
