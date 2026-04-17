// lib/macro/latest-decisions.ts
//
// Manually curated snapshot of latest central-bank decisions.
// Update on each decision day. This table overrides values derived from
// scrapers to guarantee UI consistency.
//
// `current_rate_override` exists specifically for ECB where scrapers return
// MRO (Main Refinancing Operations) but the benchmark policy rate since 2024
// is the Deposit Facility Rate (DFR).
//
// Semantic rule: ALWAYS display the LAST DECISION (including holds), never
// the last effective movement. When a bank holds, last_change_bps is 0 and
// last_change_date is the hold decision's date — NOT the date of the prior
// hike/cut.
//
// Last manually updated: 2026-04-17

export interface LatestDecision {
  last_action: "hold" | "cut" | "hike";
  last_change_bps: number; // 0 for hold
  last_change_date: string; // ISO date (YYYY-MM-DD)
  /** Optional. Use when the scraper returns a different benchmark than the
   *  one we want to display (e.g. ECB: scraper returns MRO 2.15, we want DFR 2.00). */
  current_rate_override?: number;
}

export const LATEST_DECISIONS: Record<string, LatestDecision> = {
  FED: {
    last_action: "hold",
    last_change_bps: 0,
    last_change_date: "2026-03-18",
  },
  ECB: {
    last_action: "hold",
    last_change_bps: 0,
    last_change_date: "2026-03-12",
    // ECB benchmark policy rate = Deposit Facility Rate (DFR = 2.00%).
    // TE country-list scrapes the MRO which is a different rate.
    current_rate_override: 2.0,
  },
  BOE: {
    last_action: "hold",
    last_change_bps: 0,
    last_change_date: "2026-03-18",
  },
  BOJ: {
    last_action: "hold",
    last_change_bps: 0,
    last_change_date: "2026-03-19",
  },
  BCB: {
    last_action: "cut",
    last_change_bps: -25,
    last_change_date: "2026-03-18",
  },
  BOC: {
    last_action: "hold",
    last_change_bps: 0,
    last_change_date: "2026-03-18",
  },
};
