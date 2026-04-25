-- Sync starting_balance_usd between accounts and prop_accounts.
--
-- Background: prop-firm accounts (FTMO, Apex, The5ers, DefiVers, Bulenox,
-- etc.) work fundamentally differently from personal accounts. The firm
-- gives the trader a funded balance to operate on top of — that capital
-- IS the starting balance, not "lucro acumulado até X". The
-- AddAccountModal flow correctly stores this on
-- prop_accounts.starting_balance_usd, but it leaves
-- accounts.starting_balance_usd NULL.
--
-- Half the codebase reads starting_balance from accounts (dashboard balance,
-- journal KPIs, fee calibration), so prop accounts ended up looking like
-- they started at $0 — breaking calibration math, profit %, drawdown %,
-- and equity curves. Rather than patching every read site, this migration:
--
--   1. Backfills accounts.starting_balance_usd from prop_accounts for every
--      existing prop account that's missing it.
--   2. Installs a trigger so future INSERTs / UPDATEs on prop_accounts
--      automatically sync the value to the parent accounts row.
--
-- Net effect: any code (existing or new) reading
-- accounts.starting_balance_usd works correctly for prop accounts without
-- having to know about prop_accounts at all.

-- ─── 1. Backfill ────────────────────────────────────────────────────────────

UPDATE public.accounts a
SET starting_balance_usd = pa.starting_balance_usd
FROM public.prop_accounts pa
WHERE pa.account_id = a.id
  AND pa.starting_balance_usd IS NOT NULL
  AND pa.starting_balance_usd > 0
  AND (a.starting_balance_usd IS NULL OR a.starting_balance_usd <= 0);

-- ─── 2. Sync trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_starting_balance_from_prop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync when the new value is positive and the parent accounts row
  -- doesn't already have a different positive value (we don't want to
  -- silently overwrite a manually set personal-style starting balance).
  IF NEW.starting_balance_usd IS NOT NULL AND NEW.starting_balance_usd > 0 THEN
    UPDATE public.accounts
    SET starting_balance_usd = NEW.starting_balance_usd
    WHERE id = NEW.account_id
      AND (starting_balance_usd IS NULL
        OR starting_balance_usd <= 0
        OR starting_balance_usd = COALESCE(OLD.starting_balance_usd, -1));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_starting_balance_from_prop_ins ON public.prop_accounts;
CREATE TRIGGER sync_starting_balance_from_prop_ins
  AFTER INSERT ON public.prop_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_starting_balance_from_prop();

DROP TRIGGER IF EXISTS sync_starting_balance_from_prop_upd ON public.prop_accounts;
CREATE TRIGGER sync_starting_balance_from_prop_upd
  AFTER UPDATE OF starting_balance_usd ON public.prop_accounts
  FOR EACH ROW
  WHEN (NEW.starting_balance_usd IS DISTINCT FROM OLD.starting_balance_usd)
  EXECUTE FUNCTION public.sync_starting_balance_from_prop();
