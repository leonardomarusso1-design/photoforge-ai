alter type public.shoot_status add value if not exists 'waiting_photos';
alter type public.shoot_status add value if not exists 'review';
alter type public.shoot_status add value if not exists 'approved';

alter table public.shoots
add column if not exists consent_internal_use boolean not null default false,
add column if not exists consent_whatsapp_example boolean not null default false,
add column if not exists consent_portfolio boolean not null default false,
add column if not exists consent_ads boolean not null default false,
add column if not exists consent_no_public_use boolean not null default false,
add column if not exists recreate_reference_mode boolean not null default false,
add column if not exists recreate_options jsonb;

alter table public.generated_images
add column if not exists portfolio_authorized boolean not null default false,
add column if not exists delivered_at timestamptz;

alter table public.shoots
drop constraint if exists shoots_status_check;

alter table public.shoots
add constraint shoots_status_check
check (status in (
  'draft',
  'waiting_photos',
  'ready',
  'generating',
  'completed',
  'review',
  'approved',
  'failed',
  'delivered',
  'archived'
));
