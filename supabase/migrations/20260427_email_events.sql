-- Resend webhook event sink. One row per delivered/opened/clicked/
-- bounced/complained event. Joined with email_logs.resend_id for
-- per-template open/click/bounce rates in the admin dashboard.

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  resend_id text not null,
  event_type text not null, -- email.delivered | email.opened | email.clicked | email.bounced | email.complained | email.delivery_delayed | email.sent
  to_email text,
  bounce_type text,         -- 'hard' | 'soft' | null (only set on email.bounced)
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists email_events_resend_idx
  on public.email_events (resend_id);

create index if not exists email_events_type_created_idx
  on public.email_events (event_type, created_at desc);

create index if not exists email_events_to_email_idx
  on public.email_events (to_email)
  where to_email is not null;

alter table public.email_events enable row level security;
-- Service-role only.
