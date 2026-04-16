-- Add risk/reward fields to journal_trades to support real per-trade RR
-- instead of the payoff ratio currently labeled as "RR médio".
--
-- Historical trades will keep NULL in these columns — they are excluded
-- from the RR averages. New imports fill them via lib/mt5-parser.ts.

ALTER TABLE journal_trades
  ADD COLUMN IF NOT EXISTS entry_price numeric,
  ADD COLUMN IF NOT EXISTS exit_price numeric,
  ADD COLUMN IF NOT EXISTS stop_loss numeric,
  ADD COLUMN IF NOT EXISTS take_profit numeric,
  ADD COLUMN IF NOT EXISTS volume numeric,
  ADD COLUMN IF NOT EXISTS risk_usd numeric,
  ADD COLUMN IF NOT EXISTS rr_realized numeric;
