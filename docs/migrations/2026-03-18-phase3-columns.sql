-- Phase 3: High Impact Features — Database Migrations
-- Run in Supabase SQL Editor

-- 1. Psychology + MFE/MAE columns on journal_trades
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS emotion TEXT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS discipline TEXT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS setup_quality TEXT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS custom_tags TEXT[];
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS entry_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS exit_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS management_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS mfe_usd NUMERIC;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS mae_usd NUMERIC;

-- 2. Dashboard layout on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dashboard_layout JSONB;

-- 3. Macro events table
CREATE TABLE IF NOT EXISTS macro_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  event_name TEXT NOT NULL,
  currency TEXT,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  actual TEXT,
  forecast TEXT,
  previous TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_macro_events_date ON macro_events (date);

ALTER TABLE macro_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read macro events"
  ON macro_events FOR SELECT USING (true);
CREATE POLICY "Service role can insert macro events"
  ON macro_events FOR INSERT WITH CHECK (true);

-- Verification query:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'journal_trades'
-- AND column_name IN ('emotion', 'discipline', 'setup_quality', 'custom_tags', 'entry_rating', 'exit_rating', 'management_rating', 'mfe_usd', 'mae_usd');
-- Expected: 9 rows
