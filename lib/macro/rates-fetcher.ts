// lib/macro/rates-fetcher.ts
import { createClient } from "@supabase/supabase-js";
import { CENTRAL_BANKS } from "./constants";
import type { CentralBankRate } from "./types";

/**
 * EMERGENCY FALLBACK ONLY — used when both Apify and DB fail.
 *
 * Primary source: Apify RAG browser → TradingEconomics (updated by cron).
 * Secondary: Supabase `central_bank_rates` table.
 * Last resort: this hardcoded object (manually maintained).
 *
 * Last updated: 2026-03-23
 */
const POLICY_RATES: Record<string, {
  current_rate: number;
  last_action: "hold" | "cut" | "hike";
  last_change_bps: number;
  last_change_date: string;
  next_meeting: string | null;
}> = {
  FED:     { current_rate: 3.625, last_action: "hold",  last_change_bps: -25,  last_change_date: "2025-12-10", next_meeting: "2026-04-29" },
  ECB:     { current_rate: 2.150, last_action: "hold",  last_change_bps: -25,  last_change_date: "2025-06-05", next_meeting: "2026-04-17" },
  BOE:     { current_rate: 3.750, last_action: "hold",  last_change_bps: -25,  last_change_date: "2025-12-18", next_meeting: "2026-04-30" },
  BOJ:     { current_rate: 0.750, last_action: "hold",  last_change_bps: 25,   last_change_date: "2025-12-19", next_meeting: "2026-04-28" },
  BCB:     { current_rate: 14.750, last_action: "cut",  last_change_bps: -25,  last_change_date: "2026-03-18", next_meeting: "2026-04-29" },
  BOC:     { current_rate: 2.250, last_action: "hold",  last_change_bps: -25,  last_change_date: "2025-10-29", next_meeting: "2026-04-16" },
  RBA:     { current_rate: 4.100, last_action: "hike",  last_change_bps: 25,   last_change_date: "2026-03-18", next_meeting: "2026-05-05" },
  PBOC:    { current_rate: 3.000, last_action: "hold",  last_change_bps: -10,  last_change_date: "2025-05-20", next_meeting: "2026-04-20" },
  SNB:     { current_rate: 0.000, last_action: "hold",  last_change_bps: -25,  last_change_date: "2025-06-19", next_meeting: "2026-06-19" },
  BANXICO: { current_rate: 7.000, last_action: "hold",  last_change_bps: -25,  last_change_date: "2025-12-18", next_meeting: "2026-03-26" },
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function mapHardcodedToRate(code: string): Omit<CentralBankRate, "id"> {
  const cb = CENTRAL_BANKS.find((b) => b.code === code);
  const data = POLICY_RATES[code];
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
    next_meeting: data.next_meeting,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchCentralBankRates(): Promise<Omit<CentralBankRate, "id">[]> {
  // Try DB first
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
        }));
      }
    } catch (err) {
      console.warn("[rates-fetcher] DB read failed, falling back to hardcoded:", err);
    }
  }

  // Fallback to hardcoded rates
  return CENTRAL_BANKS.map((cb) => mapHardcodedToRate(cb.code));
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
