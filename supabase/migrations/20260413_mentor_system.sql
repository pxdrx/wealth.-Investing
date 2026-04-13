-- ============================================
-- Mentor System: Tables, RLS, Indexes
-- ============================================

-- 1. mentor_relationships
CREATE TABLE IF NOT EXISTS public.mentor_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'revoked', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- Unique constraint: one active relationship per student-mentor pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentor_rel_unique_active
  ON public.mentor_relationships (mentor_id, student_id)
  WHERE status = 'active';

-- Unique invite code (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentor_rel_invite_code
  ON public.mentor_relationships (UPPER(invite_code));

-- Fast lookup by student
CREATE INDEX IF NOT EXISTS idx_mentor_rel_student
  ON public.mentor_relationships (student_id) WHERE status = 'active';

-- Fast lookup by mentor
CREATE INDEX IF NOT EXISTS idx_mentor_rel_mentor
  ON public.mentor_relationships (mentor_id) WHERE status IN ('active', 'pending');

-- Enable RLS
ALTER TABLE public.mentor_relationships ENABLE ROW LEVEL SECURITY;

-- Mentor can see their own relationships
CREATE POLICY mentor_rel_mentor_select ON public.mentor_relationships
  FOR SELECT USING (mentor_id = auth.uid());

-- Mentor can insert (generate invite codes)
CREATE POLICY mentor_rel_mentor_insert ON public.mentor_relationships
  FOR INSERT WITH CHECK (mentor_id = auth.uid());

-- Student can see relationships where they are the student
CREATE POLICY mentor_rel_student_select ON public.mentor_relationships
  FOR SELECT USING (student_id = auth.uid());

-- Student can update their own relationship (to revoke)
CREATE POLICY mentor_rel_student_update ON public.mentor_relationships
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Anyone can update pending relationships (to claim invite code)
-- This allows a student to set student_id on a pending row
CREATE POLICY mentor_rel_claim_invite ON public.mentor_relationships
  FOR UPDATE USING (status = 'pending' AND student_id IS NULL)
  WITH CHECK (student_id = auth.uid() AND status = 'active');

-- 2. mentor_notes
CREATE TABLE IF NOT EXISTS public.mentor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.mentor_relationships(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id uuid REFERENCES public.journal_trades(id) ON DELETE SET NULL,
  note_date date,
  content text NOT NULL,
  rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentor_notes_student
  ON public.mentor_notes (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_notes_relationship
  ON public.mentor_notes (relationship_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_notes_trade
  ON public.mentor_notes (trade_id) WHERE trade_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.mentor_notes ENABLE ROW LEVEL SECURITY;

-- Mentor can CRUD their own notes
CREATE POLICY mentor_notes_mentor_select ON public.mentor_notes
  FOR SELECT USING (mentor_id = auth.uid());

CREATE POLICY mentor_notes_mentor_insert ON public.mentor_notes
  FOR INSERT WITH CHECK (mentor_id = auth.uid());

CREATE POLICY mentor_notes_mentor_update ON public.mentor_notes
  FOR UPDATE USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

CREATE POLICY mentor_notes_mentor_delete ON public.mentor_notes
  FOR DELETE USING (mentor_id = auth.uid());

-- Student can read notes addressed to them
CREATE POLICY mentor_notes_student_select ON public.mentor_notes
  FOR SELECT USING (student_id = auth.uid());
