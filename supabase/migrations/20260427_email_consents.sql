-- Audit trail of granted email consents (LGPD/CAN-SPAM compliance).
-- One row per (user, channel) consent grant. Captures IP + UA for proof
-- of opt-in. Revocation is tracked via the existing email_opt_outs
-- table (kept separate to preserve a clean grant ledger).

create table if not exists public.email_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  channel text not null, -- 'welcome' | 'daily-briefing' | 'weekly-recap' | 'upgrade' | 'churn' | 'transactional' | 'all'
  granted_at timestamptz not null default now(),
  granted_via text not null, -- 'signup-auth' | 'double-opt-in' | 'admin' | 'one-click-resubscribe'
  ip text,
  user_agent text,
  unique (email, channel)
);

create index if not exists email_consents_user_idx
  on public.email_consents (user_id);

create index if not exists email_consents_email_idx
  on public.email_consents (email);

alter table public.email_consents enable row level security;
-- Service-role only writes. No user-facing policies.
