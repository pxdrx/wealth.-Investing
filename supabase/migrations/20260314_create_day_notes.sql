-- Migration: Create day_notes table for PnL calendar blue dot feature
-- Run this manually in Supabase SQL Editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS day_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  observation TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE day_notes ENABLE ROW LEVEL SECURITY;

-- Allow users to select, insert, update, and delete their own notes
CREATE POLICY "Users can manage their own day notes"
  ON day_notes FOR ALL USING (auth.uid() = user_id);

-- Index for faster lookups by user + date range (used by PnlCalendar)
CREATE INDEX IF NOT EXISTS idx_day_notes_user_date ON day_notes (user_id, date);
