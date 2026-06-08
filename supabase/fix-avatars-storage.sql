-- Optional helper for profile avatars.
-- Run once in Supabase SQL Editor if avatar upload says the avatars bucket does not exist.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars read public" on storage.objects;
create policy "avatars read public" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
