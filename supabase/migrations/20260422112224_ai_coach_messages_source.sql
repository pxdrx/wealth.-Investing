-- Add `source` column to ai_coach_messages so the same table can hold messages
-- from the three Dexter surfaces: Coach (structured analysis), Analyst (ticker
-- research) and Companion (ambient chat). RLS policies already filter by
-- user_id so no policy changes are required.

ALTER TABLE ai_coach_messages
  ADD COLUMN source TEXT NOT NULL DEFAULT 'coach'
  CHECK (source IN ('coach','analyst','companion'));

CREATE INDEX idx_ai_coach_messages_source_user
  ON ai_coach_messages(user_id, source, created_at DESC);
