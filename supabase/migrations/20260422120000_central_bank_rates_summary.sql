-- Add editorial summary + source_url to central_bank_rates so the Macro page
-- can render honest, sourced descriptive text per central bank.
--
-- Both columns are nullable: if the TE paragraph scrape fails we leave them
-- null and the frontend hides the descriptive section. Never invent text.

ALTER TABLE public.central_bank_rates
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

COMMENT ON COLUMN public.central_bank_rates.summary IS
  'First descriptive paragraph scraped from the TradingEconomics interest-rate page for this bank. Null when scrape failed or source_confidence=fallback. Never invented.';

COMMENT ON COLUMN public.central_bank_rates.source_url IS
  'URL of the TradingEconomics page the summary was scraped from. Enables attribution + manual re-verification.';
