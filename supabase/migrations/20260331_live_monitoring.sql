-- Live Monitoring: MetaAPI integration for real-time prop firm monitoring
-- Tables: metaapi_connections, live_equity_snapshots, live_alert_configs, live_alerts_log

-- 1. MetaAPI account connections
CREATE TABLE IF NOT EXISTS metaapi_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  metaapi_account_id TEXT NOT NULL,
  broker_login TEXT NOT NULL,
  broker_server TEXT NOT NULL,
  encrypted_investor_password TEXT NOT NULL,
  connection_status TEXT DEFAULT 'pending'
    CHECK (connection_status IN ('pending','connecting','connected','disconnected','error')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE metaapi_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own metaapi connections"
  ON metaapi_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_metaapi_conn_user ON metaapi_connections(user_id);
CREATE INDEX idx_metaapi_conn_status ON metaapi_connections(connection_status);

-- 2. Live equity snapshots (periodic readings from MetaAPI)
CREATE TABLE IF NOT EXISTS live_equity_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES metaapi_connections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  equity NUMERIC NOT NULL,
  balance NUMERIC NOT NULL,
  margin NUMERIC,
  free_margin NUMERIC,
  open_positions_count INT DEFAULT 0,
  unrealized_pnl NUMERIC DEFAULT 0,
  daily_pnl NUMERIC DEFAULT 0,
  daily_dd_pct NUMERIC DEFAULT 0,
  overall_dd_pct NUMERIC DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE live_equity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own equity snapshots"
  ON live_equity_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own equity snapshots"
  ON live_equity_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_snapshots_conn_time
  ON live_equity_snapshots(connection_id, recorded_at DESC);

CREATE INDEX idx_snapshots_user_account
  ON live_equity_snapshots(user_id, account_id, recorded_at DESC);

-- 3. Live alert configurations (user-configurable thresholds per account)
CREATE TABLE IF NOT EXISTS live_alert_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('daily_dd','overall_dd')),
  warning_threshold_pct NUMERIC NOT NULL DEFAULT 4.0,
  critical_threshold_pct NUMERIC NOT NULL DEFAULT 4.5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_id, alert_type)
);

ALTER TABLE live_alert_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert configs"
  ON live_alert_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Live alerts log (triggered alerts from live equity data)
CREATE TABLE IF NOT EXISTS live_alerts_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('daily_dd','overall_dd')),
  severity TEXT NOT NULL CHECK (severity IN ('warning','critical','breach')),
  threshold_pct NUMERIC NOT NULL,
  actual_pct NUMERIC NOT NULL,
  equity_at_alert NUMERIC NOT NULL,
  message TEXT NOT NULL,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE live_alerts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own live alerts"
  ON live_alerts_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_live_alerts_user_account
  ON live_alerts_log(user_id, account_id, created_at DESC);

CREATE INDEX idx_live_alerts_undismissed
  ON live_alerts_log(user_id, account_id)
  WHERE dismissed = false;

-- Enable Supabase Realtime on live_alerts_log for instant toast notifications
ALTER PUBLICATION supabase_realtime ADD TABLE live_alerts_log;
