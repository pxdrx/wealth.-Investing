-- Adaptive CSV import learning system: per-user format profiles + global alias vocabulary.
-- Backs the preview/mapping flow in app/api/journal/import-mt5/route.ts and the
-- helpers in lib/journal/{import-profiles,alias-vocabulary}.ts. Yesterday's shipping
-- (commit 91ca746) deployed the code paths but these tables were missing, so
-- getProfileByFingerprint / getCachedVocabulary silently returned empty, blocking
-- the ML-style learning loop.

-- ─── import_profiles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- stable hash of (separator + encoding + normalized sorted headers)
  format_fingerprint TEXT NOT NULL,
  -- 'ctrader_csv' | 'csv_adaptive' | 'csv_adaptive_tradovate' | ...
  broker_guess TEXT,
  separator TEXT,
  encoding TEXT,
  headers TEXT[],
  -- { symbol: { header, confidence }, pnl_usd: {...}, ... }
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  validated_by_user BOOLEAN NOT NULL DEFAULT false,
  -- who produced the mapping: 'parser' | 'claude_haiku' | 'user'
  suggested_by TEXT,
  success_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT import_profiles_user_fingerprint_unique
    UNIQUE (user_id, format_fingerprint)
);

CREATE INDEX IF NOT EXISTS import_profiles_user_last_used_idx
  ON import_profiles (user_id, last_used_at DESC);

ALTER TABLE import_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_profiles_select_own" ON import_profiles;
CREATE POLICY "import_profiles_select_own"
  ON import_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "import_profiles_insert_own" ON import_profiles;
CREATE POLICY "import_profiles_insert_own"
  ON import_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "import_profiles_update_own" ON import_profiles;
CREATE POLICY "import_profiles_update_own"
  ON import_profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "import_profiles_delete_own" ON import_profiles;
CREATE POLICY "import_profiles_delete_own"
  ON import_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ─── import_alias_vocabulary ────────────────────────────────────────────────
-- Global table (no user scope) — aliases are anonymous learnings shared across
-- the installation so the parser improves cumulatively.
CREATE TABLE IF NOT EXISTS import_alias_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_field TEXT NOT NULL,
  alias TEXT NOT NULL,
  -- 'user_confirmed' | 'claude_haiku' | 'system_seed'
  source TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 1.0,
  seen_count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT import_alias_vocabulary_canonical_alias_unique
    UNIQUE (canonical_field, alias)
);

CREATE INDEX IF NOT EXISTS import_alias_vocabulary_canonical_idx
  ON import_alias_vocabulary (canonical_field);

-- No RLS: read-only for authenticated clients via the service role in the API route;
-- writes also go through the API route, so direct table access from clients is not needed.

-- ─── journal_trades CHECK constraint expansion ──────────────────────────────
-- Broaden external_source to accept CSV-adaptive variants + known broker APIs.
ALTER TABLE journal_trades DROP CONSTRAINT IF EXISTS journal_trades_external_source_check;
ALTER TABLE journal_trades ADD CONSTRAINT journal_trades_external_source_check
  CHECK (external_source IN (
    'mt5','mt4','ctrader','tradovate','ninjatrader',
    'csv_generic','csv_mt5','csv_ctrader','csv_tradovate','csv_ninjatrader','csv_custom',
    'metaapi','manual','tradingview','api'
  ));
