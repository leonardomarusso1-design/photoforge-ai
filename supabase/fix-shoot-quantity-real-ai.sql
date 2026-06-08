-- Allow small image counts for admin-only real AI tests.
-- Run this once in Supabase SQL Editor if saving a 1-image shoot fails.

alter table public.shoots
drop constraint if exists shoots_quantity_check;

alter table public.shoots
add constraint shoots_quantity_check
check (quantity in (1, 2, 4, 8, 16));
