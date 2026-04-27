-- Per-send audit log for the email engine. Captures every send attempt
-- (success or failure) by template + user + timestamp.
-- Joined with email_events (Task 08) to compute open/click/bounce rates.

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  template text not null,
  to_email text not null,
  resend_id text,
  status text not null default 'sent', -- sent | failed | skipped
  error text,
  sent_at timestamptz not null default now()
);

create index if not exists email_logs_user_idx
  on public.email_logs (user_id, sent_at desc);

create index if not exists email_logs_template_sent_idx
  on public.email_logs (template, sent_at desc);

create index if not exists email_logs_resend_idx
  on public.email_logs (resend_id)
  where resend_id is not null;

alter table public.email_logs enable row level security;
-- Service-role only.
