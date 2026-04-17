-- Add tier column for source weighting (TE breaking > TE api > ForexLive/Reuters > Truth Social)
ALTER TABLE public.macro_headlines
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_headlines_tier
  ON public.macro_headlines USING btree (tier, fetched_at DESC);
