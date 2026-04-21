-- B-10: analytics_events table for conversion funnel instrumentation.
-- Writes: anon + authenticated (RLS constrained). Reads: service_role only (default deny).

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  props jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc)
  where user_id is not null;

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events_insert_any" on public.analytics_events;
create policy "analytics_events_insert_any"
  on public.analytics_events for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- No SELECT policy on purpose: only service_role (admin dashboards) reads.
