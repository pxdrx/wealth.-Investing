-- Psychology cache: 1 análise por dia (por user + account + period).
-- Adiciona coluna cache_date (DATE) derivada do created_at em fuso America/Sao_Paulo.

alter table public.ai_psychology_cache
  add column if not exists cache_date date;

-- Backfill para registros existentes (deriva do created_at em BR)
update public.ai_psychology_cache
  set cache_date = (created_at at time zone 'America/Sao_Paulo')::date
  where cache_date is null;

alter table public.ai_psychology_cache
  alter column cache_date set not null;

-- Lookup rápido de "análise do dia"
create index if not exists ai_psychology_cache_daily_idx
  on public.ai_psychology_cache (user_id, account_id, period, cache_date desc);
