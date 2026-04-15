-- Persistent log of cron job invocations so silent failures stop being silent.
-- Vercel log retention on Hobby is <24h; cron_runs is the source of truth.
create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  cron_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('ok','failed','skipped')),
  sent int,
  matched int,
  error text,
  payload jsonb
);

create index if not exists cron_runs_name_started_idx
  on public.cron_runs (cron_name, started_at desc);

alter table public.cron_runs enable row level security;

-- No user-facing policies. Writes happen via service role from cron handlers;
-- reads via /api/admin/cron-status (admin-gated, uses service role).
