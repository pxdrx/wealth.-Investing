-- Daily macro adjustment audit log
-- One row per regeneration; latest row for a given week_start is the current "ajuste diário"
-- Generated in response to red lines (high-impact economic events with filled actuals)

CREATE TABLE IF NOT EXISTS public.daily_adjustments (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  week_start          date        NOT NULL,
  generated_at        timestamptz NOT NULL DEFAULT now(),
  narrative           text        NOT NULL,
  based_on_events     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  asset_updates       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  source              text        NOT NULL DEFAULT 'manual',
  model               text        NOT NULL DEFAULT 'claude-sonnet-4-6',

  CONSTRAINT daily_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT daily_adjustments_source_chk CHECK (source IN ('manual', 'cascade', 'cron'))
);

CREATE INDEX IF NOT EXISTS idx_daily_adjustments_week_generated
  ON public.daily_adjustments (week_start, generated_at DESC);

-- RLS: readable by any authenticated user (same posture as weekly_panoramas / macro_headlines).
-- Writes only via service_role (endpoints hit via Bearer + service client, or cron auth).
ALTER TABLE public.daily_adjustments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_adjustments' AND policyname = 'Authenticated users can read daily adjustments'
  ) THEN
    CREATE POLICY "Authenticated users can read daily adjustments"
      ON public.daily_adjustments
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
