// lib/macro/rates-fetcher.ts
import { CENTRAL_BANKS } from "./constants";
import type { CentralBankRate } from "./types";

/**
 * Central bank policy rates — manually maintained.
 *
 * HOW TO UPDATE: Ask Claude to research current CB rates and update this object.
 * Run a session with: "Pesquise as taxas de juros atuais dos 10 bancos centrais
 * e atualize lib/macro/rates-fetcher.ts"
 *
 * Last updated: 2026-03-19
 */
const POLICY_RATES: Record<string, {
  current_rate: number;
  last_action: "hold" | "cut" | "hike";
  last_change_bps: number;
  last_change_date: string;
  next_meeting: string | null;
}> = {
  FED:     { current_rate: 4.500, last_action: "hold",  last_change_bps: -25,  last_change_date: "2024-12-18", next_meeting: "2026-05-07" },
  ECB:     { current_rate: 2.650, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-03-06", next_meeting: "2026-04-17" },
  BOE:     { current_rate: 4.500, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-02-06", next_meeting: "2026-05-08" },
  BOJ:     { current_rate: 0.500, last_action: "hike",  last_change_bps: 25,   last_change_date: "2025-01-24", next_meeting: "2026-04-25" },
  BCB:     { current_rate: 14.250, last_action: "hike", last_change_bps: 100,  last_change_date: "2025-03-19", next_meeting: "2026-05-07" },
  BOC:     { current_rate: 2.750, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-03-12", next_meeting: "2026-04-16" },
  RBA:     { current_rate: 4.100, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-02-18", next_meeting: "2026-04-01" },
  PBOC:    { current_rate: 3.100, last_action: "cut",   last_change_bps: -25,  last_change_date: "2024-10-21", next_meeting: null },
  SNB:     { current_rate: 0.250, last_action: "cut",   last_change_bps: -25,  last_change_date: "2025-03-20", next_meeting: "2026-06-19" },
  BANXICO: { current_rate: 9.500, last_action: "cut",   last_change_bps: -50,  last_change_date: "2025-03-27", next_meeting: "2026-05-15" },
};

export async function fetchCentralBankRates(): Promise<Omit<CentralBankRate, "id">[]> {
  return CENTRAL_BANKS.map((cb) => {
    const data = POLICY_RATES[cb.code];
    if (!data) {
      return {
        bank_code: cb.code,
        bank_name: cb.name,
        country: cb.country,
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
  });
}
