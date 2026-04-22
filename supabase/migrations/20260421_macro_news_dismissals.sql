-- Persist macro news dismissals server-side so they survive across browsers/devices.
-- Mirrors the pattern used by smart_alert_dismissals.

create table if not exists public.macro_news_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  news_key text not null,
  dismissed_at timestamptz not null default now(),
  unique (user_id, news_key)
);

create index if not exists macro_news_dismissals_user_dismissed_idx
  on public.macro_news_dismissals (user_id, dismissed_at desc);

alter table public.macro_news_dismissals enable row level security;

drop policy if exists "own rows" on public.macro_news_dismissals;
create policy "own rows" on public.macro_news_dismissals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
