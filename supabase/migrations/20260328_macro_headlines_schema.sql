-- Schema documentation migration (table already exists)
-- Generated from live Supabase schema on 2026-03-28

CREATE TABLE IF NOT EXISTS public.macro_headlines (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  source      text        NOT NULL,
  headline    text        NOT NULL,
  summary     text,
  author      text,
  url         text,
  impact      text                 DEFAULT 'medium'::text,
  published_at timestamptz,
  fetched_at  timestamptz NOT NULL  DEFAULT now(),
  external_id text,
  metadata    jsonb,

  CONSTRAINT macro_headlines_pkey PRIMARY KEY (id),
  CONSTRAINT macro_headlines_source_external_id_key UNIQUE (source, external_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_headlines_fetched ON public.macro_headlines USING btree (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_headlines_source  ON public.macro_headlines USING btree (source, fetched_at DESC);

-- RLS
ALTER TABLE public.macro_headlines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'macro_headlines' AND policyname = 'Anyone can read headlines') THEN
    CREATE POLICY "Anyone can read headlines" ON public.macro_headlines FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'macro_headlines' AND policyname = 'Service role can manage headlines') THEN
    CREATE POLICY "Service role can manage headlines" ON public.macro_headlines FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
