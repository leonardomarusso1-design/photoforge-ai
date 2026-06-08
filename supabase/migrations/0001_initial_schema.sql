create extension if not exists "pgcrypto";

create type public.user_role as enum ('user', 'community', 'admin');
create type public.shoot_status as enum ('draft', 'ready', 'generating', 'completed', 'failed', 'delivered', 'archived');
create type public.credit_transaction_type as enum ('purchase', 'usage', 'refund', 'admin_adjustment');

create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  whatsapp text,
  role public.user_role not null default 'user',
  plan_type text not null default 'Publico',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  whatsapp text not null,
  email text,
  city text,
  age int,
  notes text,
  status text not null default 'Novo',
  total_revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.shoots (
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
  credits_used int not null default 0,
  provider text not null default 'mock',
  quantity int not null default 4 check (quantity in (1, 2, 4, 8, 16)),
  consent_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.reference_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  shoot_id uuid references public.shoots(id) on delete cascade,
  type text not null,
  file_url text not null,
  quality_status text not null default 'media',
  face_visible boolean,
  body_visible boolean,
  lighting_quality text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.generated_images (
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

create table public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  total_purchased int not null default 0,
  total_used int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.credit_transaction_type not null,
  amount int not null,
  description text not null,
  related_shoot_id uuid references public.shoots(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null default 0,
  credits int not null default 0,
  is_community_plan boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.generation_logs (
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

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.security_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

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

create policy "own profile or admin" on public.profiles for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own clients or admin" on public.clients for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own shoots or admin" on public.shoots for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own reference photos or admin" on public.reference_photos for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own generated images or admin" on public.generated_images for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own credits or admin" on public.credits for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own credit transactions or admin" on public.credit_transactions for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "plans readable" on public.plans for select using (active = true or public.is_admin());
create policy "plans admin write" on public.plans for all using (public.is_admin()) with check (public.is_admin());
create policy "own generation logs or admin" on public.generation_logs for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "settings admin" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "security logs admin" on public.security_logs for select using (public.is_admin());

insert into public.plans (name, price, credits, is_community_plan) values
  ('Comunidade', 0, 100, true),
  ('Publico', 0, 100, false),
  ('Pro', 0, 500, false),
  ('Admin', 0, 1000, false);

insert into public.app_settings (key, value) values
  ('active_provider', '"mock"'),
  ('credits_per_image', '1'),
  ('max_reference_images', '5'),
  ('max_upload_size_mb', '10'),
  ('community_discount_percentage', '30'),
  ('public_credit_price', '1.00'),
  ('community_credit_price', '0.70');

-- Storage buckets to create in Supabase dashboard or CLI:
-- user-uploads, client-reference-photos, generated-images.
-- Keep buckets private and serve files through signed URLs.
