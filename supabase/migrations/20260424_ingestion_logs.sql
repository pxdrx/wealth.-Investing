-- ingestion_logs: audit trail for journal imports.
--
-- Written by app/api/journal/import-mt5/route.ts on every upload (success
-- and error paths). The table was referenced across code and docs but a
-- migration never created it, so inserts silently dropped in environments
-- that hadn't been hand-patched. Schema mirrors the exact insert payloads
-- at route.ts:867-875 (ok path) and route.ts:944-952 (error path).
--
-- account_id lives inside the `meta` JSONB (not a top-level column) to stay
-- aligned with what the route actually writes today.

CREATE TABLE IF NOT EXISTS public.ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'partial')),
  source TEXT NOT NULL,
  items_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  message TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingestion_logs_user_created_idx
  ON public.ingestion_logs (user_id, created_at DESC);

ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingestion_logs_select_own" ON public.ingestion_logs;
CREATE POLICY "ingestion_logs_select_own"
  ON public.ingestion_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ingestion_logs_insert_own" ON public.ingestion_logs;
CREATE POLICY "ingestion_logs_insert_own"
  ON public.ingestion_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
