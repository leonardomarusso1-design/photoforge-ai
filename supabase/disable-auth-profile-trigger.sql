-- PhotoForge AI - disable Auth trigger that can block signup.
-- Run this in Supabase SQL Editor if signup shows:
-- "Database error saving new user"
--
-- The app now creates/repairs profiles safely through:
-- /api/auth/ensure-profile

drop trigger if exists on_auth_user_created on auth.users;

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
