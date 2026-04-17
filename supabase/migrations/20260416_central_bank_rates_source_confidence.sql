-- Add source_confidence to central_bank_rates so the UI can degrade honestly
-- when scrapers fail and we fall back to a stale hardcoded snapshot.
--   'scraped'  = fresh from TradingEconomics (TE Cheerio or Apify)
--   'fallback' = emergency hardcoded snapshot (stale — show a warning in UI)
--   'manual'   = human override
ALTER TABLE central_bank_rates
  ADD COLUMN IF NOT EXISTS source_confidence text
  CHECK (source_confidence IN ('scraped','fallback','manual'))
  DEFAULT 'scraped';
