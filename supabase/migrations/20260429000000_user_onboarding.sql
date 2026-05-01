-- User onboarding state — server-side source of truth for tour completion
-- and the highest tier the user has already seen onboarded.
-- Replaces the previous version-bumped localStorage flag (see lib/onboarding/version.ts).

create table if not exists public.user_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tour_completed_at timestamptz,
  max_tier_seen text not null default 'free' check (max_tier_seen in ('free','pro','ultra','mentor')),
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding enable row level security;

drop policy if exists "user_onboarding_select_own" on public.user_onboarding;
drop policy if exists "user_onboarding_insert_own" on public.user_onboarding;
drop policy if exists "user_onboarding_update_own" on public.user_onboarding;

create policy "user_onboarding_select_own" on public.user_onboarding
  for select using (auth.uid() = user_id);
create policy "user_onboarding_insert_own" on public.user_onboarding
  for insert with check (auth.uid() = user_id);
create policy "user_onboarding_update_own" on public.user_onboarding
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists user_onboarding_updated_at_idx on public.user_onboarding (updated_at);

-- Backfill: existing users should NOT re-see tour or delta modals.
-- Subscriptions table has a `plan` column (not `tier`) accepting
-- 'free' | 'pro' | 'ultra' | 'elite' | 'mentor'. The user_onboarding
-- check constraint only allows 'free' | 'pro' | 'ultra' | 'mentor', so
-- map legacy 'elite' rows to 'pro' (closest equivalent).
insert into public.user_onboarding (user_id, tour_completed_at, max_tier_seen)
select
  u.id,
  now(),
  case
    when s.plan = 'mentor' then 'mentor'
    when s.plan = 'ultra'  then 'ultra'
    when s.plan in ('pro', 'elite') then 'pro'
    else 'free'
  end
from auth.users u
left join lateral (
  select plan
  from public.subscriptions
  where user_id = u.id
    and status in ('active', 'trialing')
  order by created_at desc
  limit 1
) s on true
on conflict (user_id) do nothing;
