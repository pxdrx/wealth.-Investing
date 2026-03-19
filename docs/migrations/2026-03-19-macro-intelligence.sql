-- docs/migrations/2026-03-19-macro-intelligence.sql
-- Macro Intelligence tables — run in Supabase SQL editor

-- 1. Economic calendar events
CREATE TABLE IF NOT EXISTS economic_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_uid TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  time TIME,
  country TEXT NOT NULL,
  title TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  currency TEXT,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Weekly panoramas (AI-generated narratives)
CREATE TABLE IF NOT EXISTS weekly_panoramas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE UNIQUE NOT NULL,
  week_end DATE NOT NULL,
  te_briefing_raw TEXT,
  narrative TEXT NOT NULL,
  regional_analysis JSONB,
  market_impacts JSONB,
  decision_intelligence JSONB,
  sentiment JSONB,
  is_frozen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Central bank interest rates
CREATE TABLE IF NOT EXISTS central_bank_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_code TEXT UNIQUE NOT NULL,
  bank_name TEXT NOT NULL,
  country TEXT NOT NULL,
  current_rate DECIMAL(5,3) NOT NULL,
  last_action TEXT,
  last_change_bps INTEGER,
  last_change_date DATE,
  next_meeting DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Adaptive alerts
CREATE TABLE IF NOT EXISTS adaptive_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('breaking', 'update', 'upcoming')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_id UUID REFERENCES economic_events(id),
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Weekly snapshots (history for comparison)
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE UNIQUE NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_economic_events_week ON economic_events(week_start);
CREATE INDEX IF NOT EXISTS idx_economic_events_date ON economic_events(date);
CREATE INDEX IF NOT EXISTS idx_economic_events_impact ON economic_events(impact);
CREATE INDEX IF NOT EXISTS idx_adaptive_alerts_week ON adaptive_alerts(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_panoramas_week ON weekly_panoramas(week_start);

-- RLS: All tables are PUBLIC READ (shared data, no user_id)
ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_panoramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE central_bank_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read economic_events" ON economic_events FOR SELECT USING (true);
CREATE POLICY "Public read weekly_panoramas" ON weekly_panoramas FOR SELECT USING (true);
CREATE POLICY "Public read central_bank_rates" ON central_bank_rates FOR SELECT USING (true);
CREATE POLICY "Public read adaptive_alerts" ON adaptive_alerts FOR SELECT USING (true);
CREATE POLICY "Public read weekly_snapshots" ON weekly_snapshots FOR SELECT USING (true);

-- Service role INSERT/UPDATE (for cron jobs)
CREATE POLICY "Service insert economic_events" ON economic_events FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update economic_events" ON economic_events FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service insert weekly_panoramas" ON weekly_panoramas FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update weekly_panoramas" ON weekly_panoramas FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service insert central_bank_rates" ON central_bank_rates FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update central_bank_rates" ON central_bank_rates FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service insert adaptive_alerts" ON adaptive_alerts FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service insert weekly_snapshots" ON weekly_snapshots FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update weekly_snapshots" ON weekly_snapshots FOR UPDATE USING (auth.role() = 'service_role');
