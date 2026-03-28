-- Schema documentation migration (table already exists)
-- Generated from live Supabase schema on 2026-03-28

CREATE TABLE IF NOT EXISTS public.ai_coach_conversations (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  title      text        NOT NULL  DEFAULT 'Nova conversa'::text,
  account_id uuid,
  created_at timestamptz          DEFAULT now(),
  updated_at timestamptz          DEFAULT now(),

  CONSTRAINT ai_coach_conversations_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.ai_coach_conversations USING btree (user_id, updated_at DESC);

-- RLS
ALTER TABLE public.ai_coach_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_coach_conversations' AND policyname = 'Users manage own conversations') THEN
    CREATE POLICY "Users manage own conversations" ON public.ai_coach_conversations FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
