-- Per-channel email opt-in flags on profiles.
-- Defaults to true on existing rows so the flag does not silently mute
-- the existing audience. Hard bounces / complaints flip these to false
-- via the Resend webhook handler (Task 08).

alter table public.profiles
  add column if not exists briefing_enabled boolean not null default true;

alter table public.profiles
  add column if not exists recap_enabled boolean not null default true;

alter table public.profiles
  add column if not exists marketing_enabled boolean not null default true;
