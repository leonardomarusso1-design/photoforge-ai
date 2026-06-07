-- PhotoForge AI - fix for Supabase Auth profile trigger.
-- Run this in Supabase SQL Editor if signup shows:
-- "Database error saving new user"

alter table public.profiles
  alter column plan_type set default 'free';

alter table public.profiles
  drop constraint if exists profiles_plan_type_check;

alter table public.profiles
  add constraint profiles_plan_type_check
  check (plan_type in ('free', 'public', 'community', 'pro', 'admin', 'Comunidade', 'Publico', 'Pro', 'Admin'));

insert into public.app_settings (key, value)
values ('admin_email', '"leonardomarusso1@gmail.com"')
on conflict (key) do update set value = excluded.value, updated_at = now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  configured_admin_email text;
  new_role text := 'user';
begin
  select trim(both '"' from value::text)
  into configured_admin_email
  from public.app_settings
  where key = 'admin_email';

  if lower(coalesce(new.email, '')) = lower(coalesce(configured_admin_email, '')) then
    new_role := 'admin';
  end if;

  insert into public.profiles (user_id, name, email, role, plan_type, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''),
    coalesce(new.email, ''),
    new_role,
    'free',
    'active'
  )
  on conflict (user_id) do update
  set name = excluded.name,
      email = excluded.email,
      role = case when public.profiles.role = 'admin' then public.profiles.role else excluded.role end,
      status = 'active',
      updated_at = now();

  insert into public.credits (user_id, balance, total_purchased, total_used)
  values (new.id, 20, 20, 0)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (user_id, type, amount, description)
  values (new.id, 'admin_adjustment', 20, 'Creditos iniciais da conta');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (user_id, name, email, role, plan_type, status)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'name', split_part(users.email, '@', 1), ''),
  users.email,
  case when lower(users.email) = lower('leonardomarusso1@gmail.com') then 'admin' else 'user' end,
  'free',
  'active'
from auth.users
left join public.profiles on profiles.user_id = users.id
where profiles.user_id is null;
