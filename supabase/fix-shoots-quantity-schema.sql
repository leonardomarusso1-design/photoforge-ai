-- Corrige schema real de public.shoots para o fluxo atual de ensaios.
-- Rode no Supabase SQL Editor quando aparecer:
-- Could not find the 'quantity' column of 'shoots' in the schema cache

alter table public.shoots
add column if not exists provider text not null default 'mock';

alter table public.shoots
add column if not exists quantity int not null default 4;

alter table public.shoots
drop constraint if exists shoots_quantity_check;

alter table public.shoots
add constraint shoots_quantity_check
check (quantity in (4, 8, 16));

alter table public.shoots
add column if not exists consent_confirmed boolean not null default false;

alter table public.shoots
add column if not exists generated_prompt text;

alter table public.shoots
add column if not exists negative_prompt text;

alter table public.shoots
add column if not exists credits_used int not null default 0;

alter table public.shoots
drop constraint if exists shoots_credits_used_check;

alter table public.shoots
add constraint shoots_credits_used_check
check (credits_used >= 0);

-- Forca o PostgREST/Supabase API a recarregar o cache de schema.
notify pgrst, 'reload schema';
