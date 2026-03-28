-- Schema documentation migration (table already exists)
-- Generated from live Supabase schema on 2026-03-28

CREATE TABLE IF NOT EXISTS public.analyst_reports (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  ticker     text        NOT NULL,
  asset_type text        NOT NULL,
  report     jsonb       NOT NULL,
  created_at timestamptz          DEFAULT now(),

  CONSTRAINT analyst_reports_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analyst_reports_user ON public.analyst_reports USING btree (user_id, created_at DESC);

-- RLS
ALTER TABLE public.analyst_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyst_reports' AND policyname = 'Users can read own reports') THEN
    CREATE POLICY "Users can read own reports" ON public.analyst_reports FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyst_reports' AND policyname = 'Users can insert own reports') THEN
    CREATE POLICY "Users can insert own reports" ON public.analyst_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyst_reports' AND policyname = 'Users can delete own reports') THEN
    CREATE POLICY "Users can delete own reports" ON public.analyst_reports FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
