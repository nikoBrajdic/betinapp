-- Add persistent manual ordering for task cards.

ALTER TABLE public.task_groups
ADD COLUMN IF NOT EXISTS sort_order integer;

WITH ordered_groups AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 AS next_sort_order
  FROM public.task_groups
  WHERE sort_order IS NULL
)
UPDATE public.task_groups
SET sort_order = ordered_groups.next_sort_order
FROM ordered_groups
WHERE task_groups.id = ordered_groups.id;

CREATE INDEX IF NOT EXISTS idx_task_groups_sort_order ON public.task_groups(sort_order);
