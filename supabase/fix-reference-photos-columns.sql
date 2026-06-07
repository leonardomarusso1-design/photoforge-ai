-- Corrige schema real de public.reference_photos para uploads reais.
-- Rode no Supabase SQL Editor quando aparecer:
-- Could not find the 'body_visible' column of 'reference_photos' in the schema cache

alter table public.reference_photos
add column if not exists face_visible boolean;

alter table public.reference_photos
add column if not exists body_visible boolean;

alter table public.reference_photos
add column if not exists lighting_quality text;

alter table public.reference_photos
add column if not exists notes text;

-- Forca o PostgREST/Supabase API a recarregar o cache de schema.
notify pgrst, 'reload schema';
