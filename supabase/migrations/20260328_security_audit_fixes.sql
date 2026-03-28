-- Security Audit Fixes (SEC-006, SEC-007, SEC-008)
-- 2026-03-28

-- ============================================================
-- SEC-006: macro_events INSERT policy — restrict to service_role
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert macro events" ON macro_events;

CREATE POLICY "Service role can insert macro events"
  ON macro_events FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- SEC-007 + SEC-008: calc_drawdown — add search_path
-- ============================================================
CREATE OR REPLACE FUNCTION calc_drawdown(p_account_id uuid, p_user_id uuid)
RETURNS TABLE(
  daily_pnl numeric,
  overall_pnl numeric,
  high_water_mark numeric,
  starting_balance numeric,
  drawdown_type text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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
  hwm AS (
    SELECT COALESCE(MAX(running_total), 0) AS max_balance
    FROM (
      SELECT SUM(net_pnl_usd) OVER (ORDER BY closed_at) AS running_total
      FROM trades_90d
    ) sub
  )
  SELECT
    daily.today_pnl,
    overall.total_pnl,
    v_starting + hwm.max_balance,
    v_starting,
    v_dd_type
  FROM daily, overall, hwm;
END;
$$;

-- ============================================================
-- SEC-007 + SEC-008: increment_ai_usage — add search_path + auth.uid() check
-- ============================================================
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_month TEXT)
RETURNS TABLE(new_usage_count INT, new_daily_count INT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'auth.uid() does not match p_user_id';
  END IF;

  INSERT INTO ai_usage (user_id, month, usage_count, daily_count, daily_date, last_used_at)
  VALUES (p_user_id, p_month, 1, 1, CURRENT_DATE, now())
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    usage_count = ai_usage.usage_count + 1,
    daily_count = CASE
      WHEN ai_usage.daily_date = CURRENT_DATE THEN ai_usage.daily_count + 1
      ELSE 1
    END,
    daily_date = CURRENT_DATE,
    last_used_at = now();

  RETURN QUERY
    SELECT a.usage_count, a.daily_count
    FROM ai_usage a
    WHERE a.user_id = p_user_id AND a.month = p_month;
END;
$$;

-- ============================================================
-- SEC-007 + SEC-008: decrement_ai_usage — add search_path + auth.uid() check
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_ai_usage(p_user_id UUID, p_month TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'auth.uid() does not match p_user_id';
  END IF;

  UPDATE ai_usage
  SET usage_count = GREATEST(0, usage_count - 1),
      daily_count = GREATEST(0, daily_count - 1)
  WHERE user_id = p_user_id AND month = p_month;
END;
$$;
