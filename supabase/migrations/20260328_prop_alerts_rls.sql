-- SEC-016: Add missing INSERT, UPDATE, DELETE RLS policies for prop_alerts
-- The table already has RLS enabled and a SELECT policy, but INSERT/UPDATE/DELETE were missing.

-- INSERT: Users can only insert alerts for themselves
CREATE POLICY "Users can insert own alerts"
  ON prop_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own alerts
CREATE POLICY "Users can update own alerts"
  ON prop_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own alerts
CREATE POLICY "Users can delete own alerts"
  ON prop_alerts
  FOR DELETE
  USING (auth.uid() = user_id);
