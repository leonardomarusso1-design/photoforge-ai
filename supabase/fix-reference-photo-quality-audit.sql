-- Add quality audit fields for reference photos.
-- Run once in Supabase SQL Editor for existing projects.

alter table public.reference_photos
add column if not exists quality_score int,
add column if not exists quality_issues jsonb,
add column if not exists quality_recommendation text,
add column if not exists can_be_primary_identity boolean not null default false,
add column if not exists is_screenshot boolean not null default false,
add column if not exists has_face boolean,
add column if not exists face_clear boolean,
add column if not exists resolution_ok boolean,
add column if not exists audited_at timestamptz;

alter table public.reference_photos
alter column quality_status set default 'pending';
