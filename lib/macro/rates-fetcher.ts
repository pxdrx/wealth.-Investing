// lib/macro/rates-fetcher.ts
import { createClient } from "@supabase/supabase-js";
import { CENTRAL_BANKS } from "./constants";
import { getNextMeeting } from "./central-bank-schedule";
import type { CentralBankRate } from "./types";

/**
 * EMERGENCY_FALLBACK_RATES — LAST-RESORT SNAPSHOT ONLY.
 *
 * This hardcoded object is a manually maintained snapshot of central-bank policy
 * state. It is intentionally stale and MUST NOT be served as "current" data to
 * callers. The only legitimate use is: both Apify and Cheerio scrapers failed
 * AND the DB has no row at all — in that case we surface it flagged with
 * `source_confidence = 'fallback'` so the UI can degrade honestly.
 *
 * Do NOT copy these `last_action` / `last_change_bps` values into the DB as
 * if they were freshly scraped.
 *
 * Last manually updated: 2026-04-17
 */
export const EMERGENCY_FALLBACK_RATES: Record<string, {
  current_rate: number;
  last_action: "hold" | "cut" | "hike";
  last_change_bps: number;
  last_change_date: string;
  next_meeting: string | null;
}> = {
  FED:     { current_rate: 3.750, last_action: "hold",  last_change_bps: 0,    last_change_date: "2026-03-18", next_meeting: "2026-04-29" },
  ECB:     { current_rate: 2.000, last_action: "hold",  last_change_bps: 0,    last_change_date: "2026-03-12", next_meeting: "2026-04-30" },
  BOE:     { current_rate: 3.750, last_action: "hold",  last_change_bps: 0,    last_change_date: "2026-03-18", next_meeting: "2026-04-30" },
  BOJ:     { current_rate: 0.750, last_action: "hold",  last_change_bps: 0,    last_change_date: "2026-03-19", next_meeting: "2026-04-28" },
  BCB:     { current_rate: 14.750, last_action: "cut",  last_change_bps: -25,  last_change_date: "2026-03-18", next_meeting: "2026-04-29" },
  BOC:     { current_rate: 2.250, last_action: "hold",  last_change_bps: 0,    last_change_date: "2026-03-18", next_meeting: "2026-04-29" },
  RBA:     { current_rate: 4.100, last_action: "hike",  last_change_bps: 25,   last_change_date: "2026-03-18", next_meeting: "2026-05-05" },
  PBOC:    { current_rate: 3.000, last_action: "hold",  last_change_bps: -10,  last_change_date: "2025-05-20", next_meeting: "2026-04-20" },
  SNB:     { current_rate: 0.000, last_action: "hold",  last_change_bps: -25,  last_change_date: "2025-06-19", next_meeting: "2026-06-19" },
  BANXICO: { current_rate: 7.000, last_action: "hold",  last_change_bps: -25,  last_change_date: "2025-12-18", next_meeting: "2026-03-26" },
};

/** Rate rows enriched with source confidence for the DB. */
export type SourceConfidence = "scraped" | "fallback" | "manual";

export interface RatesFetchResult {
  ok: boolean;
  error?: string;
  rates?: Omit<CentralBankRate, "id">[];
  /** Present only when scrapers failed — caller decides whether to write it. */
  fallback?: Omit<CentralBankRate, "id">[];
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function mapFallbackToRate(code: string): Omit<CentralBankRate, "id"> {
  const cb = CENTRAL_BANKS.find((b) => b.code === code);
  const data = EMERGENCY_FALLBACK_RATES[code];
  if (!cb || !data) {
    return {
      bank_code: code,
      bank_name: code,
      country: "",
      current_rate: 0,
      last_action: null,
      last_change_bps: null,
      last_change_date: null,
      next_meeting: null,
      updated_at: new Date().toISOString(),
      summary: null,
      source_url: null,
    };
  }
  return {
    bank_code: cb.code,
    bank_name: cb.name,
    country: cb.country,
    current_rate: data.current_rate,
    last_action: data.last_action,
    last_change_bps: data.last_change_bps,
    last_change_date: data.last_change_date,
    // Prefer the authoritative 2026 calendar over the hardcoded snapshot so
    // next_meeting rolls forward automatically after each decision.
    next_meeting: getNextMeeting(cb.code) ?? data.next_meeting,
    updated_at: new Date().toISOString(),
    // Never invent text: emergency fallback rows have no sourced summary.
    summary: null,
    source_url: null,
  };
}

/**
 * Build the fallback snapshot (exported for the cron handler to write flagged rows).
 * NEVER represents live data — always flag with source_confidence='fallback' on write.
 */
export function buildEmergencyFallback(): Omit<CentralBankRate, "id">[] {
  return CENTRAL_BANKS.map((cb) => mapFallbackToRate(cb.code));
}

/**
 * Read-through for UI/page consumers.
 * Reads DB first (which the cron keeps fresh). If DB is completely empty
 * AND we have no other source, we surface the emergency fallback but log loudly.
 */
export async function fetchCentralBankRates(): Promise<Omit<CentralBankRate, "id">[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("central_bank_rates")
        .select("*")
        .order("bank_code");

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          bank_code: row.bank_code,
          bank_name: row.bank_name,
          country: row.country,
          current_rate: row.current_rate,
          last_action: row.last_action,
          last_change_bps: row.last_change_bps,
          last_change_date: row.last_change_date,
          next_meeting: row.next_meeting,
          updated_at: row.updated_at,
          // Suppress summary for non-scraped rows — we must not display stale
          // or hand-rolled copy as if TE had said it today.
          summary:
            row.source_confidence === "fallback" ? null : (row.summary ?? null),
          source_url:
            row.source_confidence === "fallback" ? null : (row.source_url ?? null),
        }));
      }
    } catch (err) {
      console.warn("[rates-fetcher] DB read failed, falling back to emergency snapshot:", err);
    }
  }

  console.warn(
    "[rates-fetcher] DB empty or unreachable — returning EMERGENCY_FALLBACK_RATES. " +
    "This is a stale snapshot; the cron must populate central_bank_rates."
  );
  return buildEmergencyFallback();
}

/**
 * Map of event title patterns to central bank codes.
 * Used by calendar-sync to auto-update rates from rate decisions.
 */
export const RATE_DECISION_PATTERNS: Record<string, string> = {
  "Fed Interest Rate Decision": "FED",
  "ECB Interest Rate Decision": "ECB",
  "BoE Interest Rate Decision": "BOE",
  "BoJ Interest Rate Decision": "BOJ",
  "BCB Selic Rate Decision": "BCB",
  "Selic Rate Decision": "BCB",
  "BoC Interest Rate Decision": "BOC",
  "RBA Interest Rate Decision": "RBA",
  "PBOC Loan Prime Rate": "PBOC",
  "SNB Interest Rate Decision": "SNB",
  "Banxico Interest Rate Decision": "BANXICO",
};

/**
 * Try to parse a rate value from event actual string.
 * Handles formats like "4.50%", "4.5", "14.25%"
 */
export function parseRateValue(actual: string): number | null {
  if (!actual) return null;
  const cleaned = actual.replace(/[%\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
