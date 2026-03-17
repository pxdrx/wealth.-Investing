-- Phase 1.5: Rule Engine — drawdown tracking + alerts
-- Run in Supabase Dashboard SQL Editor

-- ============================================================
-- 1. Add drawdown_type to prop_accounts
-- ============================================================
ALTER TABLE prop_accounts
ADD COLUMN IF NOT EXISTS drawdown_type TEXT NOT NULL DEFAULT 'static'
CHECK (drawdown_type IN ('static', 'trailing'));

-- ============================================================
-- 2. Create prop_alerts table
-- ============================================================
CREATE TABLE IF NOT EXISTS prop_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  account_id UUID REFERENCES accounts(id) NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('daily_dd', 'overall_dd')),
  threshold_pct NUMERIC NOT NULL,
  current_pct NUMERIC NOT NULL,
  message TEXT NOT NULL,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prop_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON prop_alerts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON prop_alerts FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_prop_alerts_user ON prop_alerts(user_id);
CREATE INDEX idx_prop_alerts_account ON prop_alerts(account_id);

-- ============================================================
-- 3. Postgres RPC: calc_drawdown
-- ============================================================
CREATE OR REPLACE FUNCTION calc_drawdown(p_account_id uuid, p_user_id uuid)
RETURNS TABLE(
  daily_pnl numeric,
  overall_pnl numeric,
  high_water_mark numeric,
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
