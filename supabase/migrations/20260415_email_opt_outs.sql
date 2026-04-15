-- Opt-out registry for transactional/bulk emails.
-- Honored by cron senders (morning-briefing, weekly-report, weekly-briefing).
-- Gmail RFC 8058 one-click unsubscribe writes here via /api/unsubscribe.
create table if not exists public.email_opt_outs (
  email text primary key,
  user_id uuid,
  opted_out_at timestamptz not null default now(),
  source text not null default 'one-click',
  reason text
);

create index if not exists email_opt_outs_user_idx
  on public.email_opt_outs (user_id);

alter table public.email_opt_outs enable row level security;
-- No user-facing policies. Writes happen via service role from /api/unsubscribe.
