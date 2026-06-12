alter table public.generated_images
  add column if not exists output_url text,
  add column if not exists credits_used int not null default 0 check (credits_used >= 0),
  add column if not exists error_message text;

update public.generated_images
set output_url = coalesce(output_url, file_url)
where output_url is null;
