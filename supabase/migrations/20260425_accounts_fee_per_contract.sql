-- Per-account fee/contract calibration for futures imports.
--
-- Tradovate Position History (and similar broker exports) ship gross PnL
-- only — no commission/exchange/clearing/NFA columns. Asking the user to
-- compute their per-contract round-turn fee by hand is hostile UX. The flow
-- now is: after the first import, the user pastes the broker statement
-- balance into a banner, the API back-solves the implicit fee/contract from
-- (sum of |volume| across imported trades, account_balance_drift), stores
-- it here, and reuses it automatically on subsequent imports of the same
-- account.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS fee_per_contract_round_turn NUMERIC;

COMMENT ON COLUMN public.accounts.fee_per_contract_round_turn IS
  'USD round-turn fee per contract for futures imports. NULL = unknown / not calibrated. Set by /api/account/[id]/calibrate-fees and applied by parseCsvAdaptive when the broker CSV has no commission column.';
