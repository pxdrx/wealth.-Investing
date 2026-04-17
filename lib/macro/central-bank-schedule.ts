// lib/macro/central-bank-schedule.ts
//
// Authoritative 2026 monetary-policy meeting calendar for the major central
// banks tracked by the Macro Intelligence panel.
//
// Why this exists:
//   Neither `lib/macro/scrapers/te-rates.ts` nor `lib/macro/apify/rates-scraper.ts`
//   ever populate `next_meeting` — both hardcode `null`. Relying on TE's
//   country-list page for this field is brittle (the "Next Meeting" column is
//   frequently absent / in a different locale). So we hardcode the full year
//   from official calendars and expose a helper that returns the next
//   upcoming date relative to "today".
//
// Sources (last verified on 2026-04-17):
//   FED — FOMC 2026 calendar (federalreserve.gov)
//   ECB — Governing Council monetary policy meetings (ecb.europa.eu)
//   BOE — MPC schedule (bankofengland.co.uk)
//   BOJ — Monetary Policy Meeting schedule (boj.or.jp)
//   BCB — Copom 271st–277th meetings (bcb.gov.br)
//   BOC — Policy interest rate decisions (bankofcanada.ca)
//
// Format: ISO YYYY-MM-DD, representing the day of the rate decision announcement.
// For multi-day meetings (e.g. FOMC), we use the SECOND (decision) day.

export const CB_MEETING_SCHEDULE_2026: Record<string, string[]> = {
  FED: [
    "2026-01-28",
    "2026-03-18",
    "2026-04-29",
    "2026-06-17",
    "2026-07-29",
    "2026-09-16",
    "2026-10-28",
    "2026-12-09",
  ],
  ECB: [
    "2026-01-22",
    "2026-03-12",
    "2026-04-30",
    "2026-06-04",
    "2026-07-23",
    "2026-09-10",
    "2026-10-29",
    "2026-12-17",
  ],
  BOE: [
    "2026-02-05",
    "2026-03-18",
    "2026-04-30",
    "2026-06-18",
    "2026-08-06",
    "2026-09-17",
    "2026-11-05",
    "2026-12-17",
  ],
  BOJ: [
    "2026-01-23",
    "2026-03-19",
    "2026-04-28",
    "2026-06-17",
    "2026-07-30",
    "2026-09-18",
    "2026-10-29",
    "2026-12-18",
  ],
  BCB: [
    "2026-01-28",
    "2026-03-18",
    "2026-04-29",
    "2026-06-17",
    "2026-07-29",
    "2026-09-16",
    "2026-11-04",
    "2026-12-09",
  ],
  BOC: [
    "2026-01-28",
    "2026-03-04",
    "2026-04-15",
    "2026-06-03",
    "2026-07-29",
    "2026-09-09",
    "2026-10-28",
    "2026-12-09",
  ],
};

/**
 * Returns the next scheduled rate-decision date for a bank, relative to `asOf`.
 *
 * Semantics:
 *   - "Next" means `>= today` (inclusive). If today is the meeting day we still
 *     return today, because decision hasn't been announced yet at time of call.
 *   - Dates are compared as ISO YYYY-MM-DD strings — no timezone math required.
 *   - Returns `null` if the bank code is unknown OR if all scheduled dates are
 *     in the past (i.e., the calendar needs to be refreshed for next year).
 */
export function getNextMeeting(
  bankCode: string,
  asOf: Date = new Date()
): string | null {
  const schedule = CB_MEETING_SCHEDULE_2026[bankCode];
  if (!schedule || schedule.length === 0) return null;

  const y = asOf.getFullYear();
  const m = String(asOf.getMonth() + 1).padStart(2, "0");
  const d = String(asOf.getDate()).padStart(2, "0");
  const todayIso = `${y}-${m}-${d}`;

  for (const date of schedule) {
    if (date >= todayIso) return date;
  }
  return null;
}
