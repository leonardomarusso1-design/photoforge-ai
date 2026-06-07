-- Corrige status tecnico de clients e prepara Storage para fotos de referencia.

update public.clients
set status = case status
  when 'Novo' then 'new'
  when 'Aguardando fotos' then 'waiting_photos'
  when 'Pronto para gerar' then 'ready'
  when 'Em geração' then 'generating'
  when 'Em geracao' then 'generating'
  when 'Em revisão' then 'review'
  when 'Em revisao' then 'review'
  when 'Entregue' then 'delivered'
  when 'Cancelado' then 'cancelled'
  else status
end;

alter table public.clients
drop constraint if exists clients_status_check;

alter table public.clients
add constraint clients_status_check
check (status in ('new', 'waiting_photos', 'ready', 'generating', 'review', 'delivered', 'cancelled'));

alter table public.clients
alter column status set default 'new';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-reference-photos',
  'client-reference-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "reference photos upload own folder" on storage.objects;
drop policy if exists "reference photos read own folder" on storage.objects;
drop policy if exists "reference photos update own folder" on storage.objects;
drop policy if exists "reference photos delete own folder" on storage.objects;

create policy "reference photos upload own folder"
on storage.objects
for insert
with check (
  bucket_id = 'client-reference-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "reference photos read own folder"
on storage.objects
for select
using (
  bucket_id = 'client-reference-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "reference photos update own folder"
on storage.objects
for update
using (
  bucket_id = 'client-reference-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'client-reference-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "reference photos delete own folder"
on storage.objects
for delete
using (
  bucket_id = 'client-reference-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
