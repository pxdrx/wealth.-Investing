-- EOD drawdown + editable rules + total_phases
-- Run in Supabase Dashboard SQL Editor

-- ============================================================
-- 1. Expand drawdown_type to accept 'eod'
-- ============================================================
ALTER TABLE prop_accounts DROP CONSTRAINT IF EXISTS prop_accounts_drawdown_type_check;
ALTER TABLE prop_accounts
  ADD CONSTRAINT prop_accounts_drawdown_type_check
  CHECK (drawdown_type IN ('static', 'trailing', 'eod'));

-- ============================================================
-- 2. New columns
-- ============================================================
ALTER TABLE prop_accounts
  ADD COLUMN IF NOT EXISTS total_phases integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS trail_lock_threshold_usd numeric NULL,
  ADD COLUMN IF NOT EXISTS trail_locked_floor_usd numeric NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'prop_accounts_total_phases_check'
  ) THEN
    ALTER TABLE prop_accounts
      ADD CONSTRAINT prop_accounts_total_phases_check
      CHECK (total_phases >= 0 AND total_phases <= 3);
  END IF;
END $$;

-- Backfill: funded → 0, else → 1
UPDATE prop_accounts
SET total_phases = CASE WHEN phase = 'funded' THEN 0 ELSE 1 END
WHERE total_phases IS NULL OR total_phases = 1;

-- ============================================================
-- 3. Replace calc_drawdown RPC with EOD support
--    Adds hwm_eod_usd = starting + MAX(cumulative_pnl_by_broker_day)
--    DROP required because return-row shape changed (Postgres limitation)
-- ============================================================
DROP FUNCTION IF EXISTS calc_drawdown(uuid, uuid);

CREATE OR REPLACE FUNCTION calc_drawdown(p_account_id uuid, p_user_id uuid)
RETURNS TABLE(
  daily_pnl numeric,
  overall_pnl numeric,
  high_water_mark numeric,
  hwm_eod_usd numeric,
  starting_balance numeric,
  drawdown_type text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_starting numeric;
  v_dd_type text;
  v_tz text;
  v_today_start timestamptz;
BEGIN
  SELECT pa.starting_balance_usd, pa.drawdown_type, COALESCE(pa.reset_timezone, 'America/New_York')
  INTO v_starting, v_dd_type, v_tz
  FROM prop_accounts pa
  JOIN accounts a ON a.id = pa.account_id
  WHERE pa.account_id = p_account_id AND a.user_id = p_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE v_tz) AT TIME ZONE v_tz;

  RETURN QUERY
  WITH trades_90d AS (
    SELECT net_pnl_usd, closed_at
    FROM journal_trades
    WHERE account_id = p_account_id
      AND user_id = p_user_id
      AND closed_at >= now() - interval '90 days'
  ),
  overall AS (
    SELECT COALESCE(SUM(net_pnl_usd), 0) AS total_pnl FROM trades_90d
  ),
  daily AS (
    SELECT COALESCE(SUM(net_pnl_usd), 0) AS today_pnl
    FROM trades_90d WHERE closed_at >= v_today_start
  ),
  hwm_intra AS (
    SELECT COALESCE(MAX(running_total), 0) AS max_balance
    FROM (
      SELECT SUM(net_pnl_usd) OVER (ORDER BY closed_at) AS running_total
      FROM trades_90d
    ) sub
  ),
  daily_buckets AS (
    SELECT
      date_trunc('day', closed_at AT TIME ZONE v_tz) AS day_key,
      SUM(net_pnl_usd) AS day_pnl
    FROM trades_90d
    GROUP BY 1
  ),
  daily_cum AS (
    SELECT
      day_key,
      SUM(day_pnl) OVER (ORDER BY day_key) AS cum_pnl
    FROM daily_buckets
  ),
  hwm_eod AS (
    SELECT COALESCE(MAX(cum_pnl), 0) AS max_eod_pnl FROM daily_cum
  )
  SELECT
    daily.today_pnl,
    overall.total_pnl,
    v_starting + hwm_intra.max_balance,
    v_starting + GREATEST(hwm_eod.max_eod_pnl, 0),
    v_starting,
    v_dd_type
  FROM daily, overall, hwm_intra, hwm_eod;
END;
$$;

ALTER FUNCTION calc_drawdown(uuid, uuid) SET search_path = public, pg_catalog;
