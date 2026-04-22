-- Cache of macro sentiment snapshots (Fear & Greed crypto/stocks, VIX)
-- used as fallback when external providers are unavailable.

create table if not exists public.macro_sentiment (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('crypto_fng', 'stocks_fng', 'vix')),
  value numeric,
  label text,
  raw jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists macro_sentiment_source_captured_idx
  on public.macro_sentiment (source, captured_at desc);

alter table public.macro_sentiment enable row level security;

-- Public read so anon page can hydrate the sentiment bar without auth.
drop policy if exists "public read" on public.macro_sentiment;
create policy "public read" on public.macro_sentiment
  for select using (true);

-- Writes only via service_role (background job / API route with service key).
drop policy if exists "service role insert" on public.macro_sentiment;
create policy "service role insert" on public.macro_sentiment
  for insert to service_role with check (true);
