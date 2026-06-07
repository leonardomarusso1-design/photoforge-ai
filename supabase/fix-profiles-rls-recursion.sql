-- Corrige recursao infinita na RLS de public.profiles.
-- Causa: policies de profiles chamavam public.is_admin(), e public.is_admin()
-- tambem consulta public.profiles.

alter table public.profiles enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
drop policy if exists "profiles update own or admin" on public.profiles;
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

create policy "profiles select own"
on public.profiles
for select
using (user_id = auth.uid());

create policy "profiles update own"
on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Mantem/recira a funcao de admin para as outras tabelas.
-- Agora ela consegue ler o proprio profile sem cair em recursao.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;
