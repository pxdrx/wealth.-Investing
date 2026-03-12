-- Tabela para observações diárias do trader
CREATE TABLE IF NOT EXISTS day_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  observation TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- RLS
ALTER TABLE day_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own day notes"
  ON day_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own day notes"
  ON day_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day notes"
  ON day_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own day notes"
  ON day_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_day_notes_user_date ON day_notes(user_id, date);
