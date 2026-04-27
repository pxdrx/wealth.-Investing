-- Persistent queue for delayed email sends.
-- Drained by /api/cron/email-queue-flush every 5 min (Track B Task 04+).

create table if not exists public.scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  template text not null,
  props jsonb not null,
  to_email text not null,
  send_at timestamptz not null,
  status text not null default 'pending', -- pending | sent | failed | skipped
  attempts int not null default 0,
  last_error text,
  resend_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Idempotent enqueue: scheduling the same template for the same user twice
  -- is a no-op via ON CONFLICT DO NOTHING.
  unique (user_id, template)
);

create index if not exists scheduled_emails_due_idx
  on public.scheduled_emails (send_at)
  where status = 'pending';

create index if not exists scheduled_emails_user_idx
  on public.scheduled_emails (user_id);

alter table public.scheduled_emails enable row level security;
-- Service-role only writes/reads. No user-facing policies needed.
