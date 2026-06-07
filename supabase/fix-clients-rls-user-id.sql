-- Correção das policies de clientes por auth.uid().
-- Rode este arquivo no Supabase SQL Editor se criar cliente continuar falhando por RLS.

alter table public.clients enable row level security;

drop policy if exists "clients own or admin" on public.clients;
drop policy if exists "clients select own or admin" on public.clients;
drop policy if exists "clients insert own or admin" on public.clients;
drop policy if exists "clients update own or admin" on public.clients;
drop policy if exists "clients delete own or admin" on public.clients;

create policy "clients select own or admin"
on public.clients
for select
using (auth.uid() = user_id or public.is_admin());

create policy "clients insert own or admin"
on public.clients
for insert
with check (auth.uid() = user_id or public.is_admin());

create policy "clients update own or admin"
on public.clients
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "clients delete own or admin"
on public.clients
for delete
using (auth.uid() = user_id or public.is_admin());
