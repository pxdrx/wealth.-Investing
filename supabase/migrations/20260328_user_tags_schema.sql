-- Schema documentation migration (table already exists)
-- Generated from live Supabase schema on 2026-03-28

CREATE TABLE IF NOT EXISTS public.user_tags (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  tag        text        NOT NULL,
  created_at timestamptz NOT NULL  DEFAULT now(),

  CONSTRAINT user_tags_pkey PRIMARY KEY (id),
  CONSTRAINT user_tags_user_id_tag_key UNIQUE (user_id, tag)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON public.user_tags USING btree (user_id);

-- RLS
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tags' AND policyname = 'Users can read own tags') THEN
    CREATE POLICY "Users can read own tags" ON public.user_tags FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tags' AND policyname = 'Users can insert own tags') THEN
    CREATE POLICY "Users can insert own tags" ON public.user_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tags' AND policyname = 'Users can delete own tags') THEN
    CREATE POLICY "Users can delete own tags" ON public.user_tags FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
