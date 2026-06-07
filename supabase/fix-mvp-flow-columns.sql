-- Alinha o banco real para o MVP ponta a ponta com mockProvider.

alter table public.shoots
add column if not exists consent_confirmed_at timestamptz;

alter table public.reference_photos
add column if not exists storage_path text;

update public.reference_photos
set storage_path = file_url
where storage_path is null;

alter table public.reference_photos
alter column storage_path set default '';

-- Se existir alguma constraint antiga em generation_logs.status, recrie aceitando pending.
alter table public.generation_logs
drop constraint if exists generation_logs_status_check;

alter table public.generation_logs
add constraint generation_logs_status_check
check (status in ('pending', 'success', 'failed'));

notify pgrst, 'reload schema';
