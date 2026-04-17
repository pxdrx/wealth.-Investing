-- docs/migrations/2026-04-17-daily-adjustment-source.sql
-- Allow 'weekly_fallback' as a valid value for daily_adjustments.source.
-- The fallback row is written when there are no red lines in the last 24h AND
-- no previous daily_adjustments row exists — the narrative is an excerpt of the
-- current weekly panorama so the UI card never ends up empty.

ALTER TABLE public.daily_adjustments
  DROP CONSTRAINT IF EXISTS daily_adjustments_source_chk;

ALTER TABLE public.daily_adjustments
  ADD CONSTRAINT daily_adjustments_source_chk
  CHECK (source IN ('manual', 'cascade', 'cron', 'weekly_fallback'));
