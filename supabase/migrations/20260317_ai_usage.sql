-- AI Coach usage tracking
CREATE TABLE ai_usage (
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  month TEXT NOT NULL,
  usage_count INT DEFAULT 0,
  daily_count INT DEFAULT 0,
  daily_date DATE DEFAULT CURRENT_DATE,
  last_used_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON ai_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Atomic increment with daily reset logic
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_month TEXT)
RETURNS TABLE(new_usage_count INT, new_daily_count INT) AS $$
BEGIN
  INSERT INTO ai_usage (user_id, month, usage_count, daily_count, daily_date, last_used_at)
  VALUES (p_user_id, p_month, 1, 1, CURRENT_DATE, now())
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    usage_count = ai_usage.usage_count + 1,
    daily_count = CASE
      WHEN ai_usage.daily_date = CURRENT_DATE THEN ai_usage.daily_count + 1
      ELSE 1
    END,
    daily_date = CURRENT_DATE,
    last_used_at = now();

  RETURN QUERY
    SELECT a.usage_count, a.daily_count
    FROM ai_usage a
    WHERE a.user_id = p_user_id AND a.month = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rollback on API failure
CREATE OR REPLACE FUNCTION decrement_ai_usage(p_user_id UUID, p_month TEXT)
RETURNS void AS $$
BEGIN
  UPDATE ai_usage
  SET usage_count = GREATEST(0, usage_count - 1),
      daily_count = GREATEST(0, daily_count - 1)
  WHERE user_id = p_user_id AND month = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
