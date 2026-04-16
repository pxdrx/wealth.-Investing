-- Migration: Add account_id to day_notes for per-account note isolation
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Add account_id column
ALTER TABLE day_notes ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- 2. Drop old unique constraint (user_id, date)
ALTER TABLE day_notes DROP CONSTRAINT IF EXISTS day_notes_user_id_date_key;

-- 3. New unique: one note per user + account + date
ALTER TABLE day_notes ADD CONSTRAINT day_notes_user_account_date_key UNIQUE (user_id, account_id, date);

-- 4. Replace index
DROP INDEX IF EXISTS idx_day_notes_user_date;
CREATE INDEX IF NOT EXISTS idx_day_notes_user_account_date ON day_notes (user_id, account_id, date);
