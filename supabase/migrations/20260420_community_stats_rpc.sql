-- B-03: Community stats RPC for public landing social proof.
-- Aggregates-only, zero PII. SECURITY DEFINER lets anon reach public.journal_trades
-- through this function without granting table-level SELECT.

CREATE OR REPLACE FUNCTION public.community_stats()
RETURNS TABLE (
  total_trades bigint,
  active_traders_30d bigint,
  total_volume_usd numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT count(*) FROM public.journal_trades),
    (SELECT count(DISTINCT user_id) FROM public.journal_trades
       WHERE created_at > now() - interval '30 days'),
    (SELECT coalesce(sum(abs(net_pnl_usd)), 0) FROM public.journal_trades);
$$;

GRANT EXECUTE ON FUNCTION public.community_stats() TO anon, authenticated, service_role;
