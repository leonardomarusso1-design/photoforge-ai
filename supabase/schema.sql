-- PhotoForge AI - Supabase schema
-- Run this file in the Supabase SQL Editor.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('user', 'community', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('active', 'blocked', 'deleted');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.plan_type as enum ('free', 'community', 'public', 'pro', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.shoot_status as enum ('draft', 'ready', 'generating', 'completed', 'failed', 'delivered', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.credit_transaction_type as enum ('purchase', 'usage', 'refund', 'admin_adjustment');
exception when duplicate_object then null;
end $$;

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('admin_email', '"leonardomarusso1@gmail.com"'),
  ('active_provider', '"mock"'),
  ('credits_per_image', '1'),
  ('max_reference_images', '5'),
  ('max_upload_size_mb', '10'),
  ('community_discount_percentage', '30'),
  ('public_credit_price', '1.00'),
  ('community_credit_price', '0.70')
on conflict (key) do update set value = excluded.value, updated_at = now();

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  whatsapp text,
  role public.user_role not null default 'user',
  plan_type public.plan_type not null default 'free',
  status public.account_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  whatsapp text not null,
  email text,
  city text,
  age int check (age is null or age between 0 and 130),
  notes text,
  status text not null default 'new',
  total_revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint clients_status_check check (status in ('new', 'waiting_photos', 'ready', 'generating', 'review', 'delivered', 'cancelled'))
);

create table if not exists public.shoots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  category text not null,
  status public.shoot_status not null default 'draft',
  sold_price numeric(12,2) not null default 0,
  outfit text,
  outfit_color text,
  shoes text,
  accessories text,
  hair text,
  makeup text,
  location text,
  mood text,
  pose text,
  expression text,
  lighting text,
  photo_style text,
  free_notes text,
  generated_prompt text,
  negative_prompt text,
  credits_used int not null default 0 check (credits_used >= 0),
  provider text not null default 'mock',
  quantity int not null default 4 check (quantity in (1, 2, 4, 8, 16)),
  consent_confirmed boolean not null default false,
  consent_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.reference_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  shoot_id uuid references public.shoots(id) on delete cascade,
  type text not null,
  storage_path text,
  file_url text not null,
  quality_status text not null default 'pending',
  quality_score int,
  quality_issues jsonb,
  quality_recommendation text,
  can_be_primary_identity boolean not null default false,
  is_screenshot boolean not null default false,
  has_face boolean,
  face_clear boolean,
  face_visible boolean,
  body_visible boolean,
  resolution_ok boolean,
  lighting_quality text,
  audited_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  shoot_id uuid not null references public.shoots(id) on delete cascade,
  file_url text not null,
  prompt_used text not null,
  provider text not null,
  model text not null,
  status text not null default 'completed',
  width int,
  height int,
  seed bigint,
  cost_estimate numeric(12,4) not null default 0,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance int not null default 20 check (balance >= 0),
  total_purchased int not null default 20 check (total_purchased >= 0),
  total_used int not null default 0 check (total_used >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.credit_transaction_type not null,
  amount int not null,
  description text not null,
  related_shoot_id uuid references public.shoots(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(12,2) not null default 0,
  credits int not null default 0,
  is_community_plan boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shoot_id uuid references public.shoots(id) on delete set null,
  provider text not null,
  model text not null,
  request_payload jsonb,
  response_payload jsonb,
  status text not null,
  error_message text,
  credits_charged int not null default 0,
  cost_estimate numeric(12,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.security_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_deleted_at_idx on public.clients(deleted_at);
create index if not exists shoots_user_id_idx on public.shoots(user_id);
create index if not exists shoots_client_id_idx on public.shoots(client_id);
create index if not exists shoots_status_idx on public.shoots(status);
create index if not exists reference_photos_user_id_idx on public.reference_photos(user_id);
create index if not exists reference_photos_shoot_id_idx on public.reference_photos(shoot_id);
create index if not exists generated_images_user_id_idx on public.generated_images(user_id);
create index if not exists generated_images_shoot_id_idx on public.generated_images(shoot_id);
create index if not exists credit_transactions_user_id_idx on public.credit_transactions(user_id);
create index if not exists generation_logs_user_id_idx on public.generation_logs(user_id);
create index if not exists generation_logs_shoot_id_idx on public.generation_logs(shoot_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists set_shoots_updated_at on public.shoots;
create trigger set_shoots_updated_at before update on public.shoots for each row execute function public.set_updated_at();
drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  configured_admin_email text;
  new_role public.user_role := 'user';
  new_plan public.plan_type := 'free';
begin
  select trim(both '"' from value::text)
  into configured_admin_email
  from public.app_settings
  where key = 'admin_email';

  if lower(coalesce(new.email, '')) = lower(coalesce(configured_admin_email, '')) then
    new_role := 'admin';
    new_plan := 'admin';
  end if;

  insert into public.profiles (user_id, name, email, role, plan_type, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''),
    coalesce(new.email, ''),
    new_role,
    new_plan,
    'active'
  )
  on conflict (user_id) do nothing;

  insert into public.credits (user_id, balance, total_purchased, total_used)
  values (new.id, 20, 20, 0)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (user_id, type, amount, description)
  values (new.id, 'admin_adjustment', 20, 'Creditos iniciais da conta')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.plan_type is distinct from old.plan_type
    or new.status is distinct from old.status then
    raise exception 'Only admins can change role, plan_type or status.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;
create trigger prevent_profile_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.shoots enable row level security;
alter table public.reference_photos enable row level security;
alter table public.generated_images enable row level security;
alter table public.credits enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.plans enable row level security;
alter table public.generation_logs enable row level security;
alter table public.app_settings enable row level security;
alter table public.security_logs enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (user_id = auth.uid());
drop policy if exists "profiles update own or admin" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "clients own or admin" on public.clients;
drop policy if exists "clients select own or admin" on public.clients;
drop policy if exists "clients insert own or admin" on public.clients;
drop policy if exists "clients update own or admin" on public.clients;
drop policy if exists "clients delete own or admin" on public.clients;
create policy "clients select own or admin" on public.clients for select using (user_id = auth.uid() or public.is_admin());
create policy "clients insert own or admin" on public.clients for insert with check (user_id = auth.uid() or public.is_admin());
create policy "clients update own or admin" on public.clients for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "clients delete own or admin" on public.clients for delete using (user_id = auth.uid() or public.is_admin());
drop policy if exists "shoots own or admin" on public.shoots;
create policy "shoots own or admin" on public.shoots for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "reference photos own or admin" on public.reference_photos;
create policy "reference photos own or admin" on public.reference_photos for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "generated images own or admin" on public.generated_images;
create policy "generated images own or admin" on public.generated_images for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "credits own or admin" on public.credits;
create policy "credits own or admin" on public.credits for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "credit transactions own or admin" on public.credit_transactions;
create policy "credit transactions own or admin" on public.credit_transactions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "plans readable" on public.plans;
create policy "plans readable" on public.plans for select using (active = true or public.is_admin());
drop policy if exists "plans admin write" on public.plans;
create policy "plans admin write" on public.plans for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "generation logs own or admin" on public.generation_logs;
create policy "generation logs own or admin" on public.generation_logs for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "settings admin" on public.app_settings;
create policy "settings admin" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "security logs admin" on public.security_logs;
create policy "security logs admin" on public.security_logs for select using (public.is_admin());

insert into public.plans (name, price, credits, is_community_plan, active) values
  ('Comunidade', 0, 100, true, true),
  ('Publico', 0, 100, false, true),
  ('Pro', 0, 500, false, true),
  ('Admin', 0, 1000, false, true)
on conflict (name) do update
set price = excluded.price,
    credits = excluded.credits,
    is_community_plan = excluded.is_community_plan,
    active = excluded.active;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('user-uploads', 'user-uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('client-reference-photos', 'client-reference-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('generated-images', 'generated-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage users read own or admin" on storage.objects;
create policy "storage users read own or admin" on storage.objects for select using (
  bucket_id in ('user-uploads', 'client-reference-photos', 'generated-images')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "storage users upload own" on storage.objects;
create policy "storage users upload own" on storage.objects for insert with check (
  bucket_id in ('user-uploads', 'client-reference-photos', 'generated-images')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage users update own or admin" on storage.objects;
create policy "storage users update own or admin" on storage.objects for update using (
  bucket_id in ('user-uploads', 'client-reference-photos', 'generated-images')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
) with check (
  bucket_id in ('user-uploads', 'client-reference-photos', 'generated-images')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "storage users delete own or admin" on storage.objects;
create policy "storage users delete own or admin" on storage.objects for delete using (
  bucket_id in ('user-uploads', 'client-reference-photos', 'generated-images')
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
