-- 2026-04-17-rates-correction.sql
--
-- One-shot correction of central_bank_rates with the authoritative state
-- as of 2026-04-17, validated against official sources (Fed.gov, ECB,
-- BoE, BoJ, BCB, BoC).
--
-- Context: forensic audit of the Macro Intelligence rates panel uncovered
-- four classes of bug (stale next_meeting dates, BCB still showing pre-cut,
-- BOE/BOJ/ECB showing last MOVEMENT instead of last DECISION, ECB showing
-- MRO instead of DFR). The scrapers + override layer fix the steady state;
-- this seed fixes the DB immediately so the UI updates without waiting for
-- the next cron tick.

-- FED: held 2026-03-18 at 3.75% (upper bound of 3.50-3.75% target range)
UPDATE central_bank_rates
SET current_rate      = 3.75,
    last_action       = 'hold',
    last_change_bps   = 0,
    last_change_date  = '2026-03-18',
    next_meeting      = '2026-04-29',
    source_confidence = 'scraped',
    updated_at        = now()
WHERE bank_code = 'FED';

-- ECB: held 2026-03-12. Benchmark = DFR 2.00% (NOT MRO 2.15%)
UPDATE central_bank_rates
SET current_rate      = 2.00,
    last_action       = 'hold',
    last_change_bps   = 0,
    last_change_date  = '2026-03-12',
    next_meeting      = '2026-04-30',
    source_confidence = 'scraped',
    updated_at        = now()
WHERE bank_code = 'ECB';

-- BOE: held 2026-03-18 at 3.75% (5-4 vote for hold per BoE minutes)
UPDATE central_bank_rates
SET current_rate      = 3.75,
    last_action       = 'hold',
    last_change_bps   = 0,
    last_change_date  = '2026-03-18',
    next_meeting      = '2026-04-30',
    source_confidence = 'scraped',
    updated_at        = now()
WHERE bank_code = 'BOE';

-- BOJ: held 2026-03-19 at 0.75%
UPDATE central_bank_rates
SET current_rate      = 0.75,
    last_action       = 'hold',
    last_change_bps   = 0,
    last_change_date  = '2026-03-19',
    next_meeting      = '2026-04-28',
    source_confidence = 'scraped',
    updated_at        = now()
WHERE bank_code = 'BOJ';

-- BCB: CUT 25bps on 2026-03-18, Selic 15.00% -> 14.75% (Copom)
UPDATE central_bank_rates
SET current_rate      = 14.75,
    last_action       = 'cut',
    last_change_bps   = -25,
    last_change_date  = '2026-03-18',
    next_meeting      = '2026-04-29',
    source_confidence = 'scraped',
    updated_at        = now()
WHERE bank_code = 'BCB';

-- BOC: held 2026-03-18 at 2.25%
UPDATE central_bank_rates
SET current_rate      = 2.25,
    last_action       = 'hold',
    last_change_bps   = 0,
    last_change_date  = '2026-03-18',
    next_meeting      = '2026-04-29',
    source_confidence = 'scraped',
    updated_at        = now()
WHERE bank_code = 'BOC';
