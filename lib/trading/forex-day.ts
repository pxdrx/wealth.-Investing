/**
 * Forex trading day boundary utilities.
 * Forex day starts/ends at 17:00 ET (Eastern Time).
 * Uses Intl API for automatic DST handling — no hardcoded UTC offsets.
 */

/** Get the current hour in ET timezone */
function etHourOf(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(date)
  );
}

/** Get YYYY-MM-DD in ET timezone */
function etDateOf(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // "YYYY-MM-DD" (en-CA uses ISO format)
}

/**
 * Returns the start of the current forex trading day as a UTC Date.
 * If before 17:00 ET → started 17:00 ET yesterday.
 * If >= 17:00 ET → started 17:00 ET today.
 */
export function getForexDayStart(now?: Date): Date {
  const d = now ?? new Date();
  const hour = etHourOf(d);

  // Get the ET date for the boundary day
  const boundaryDate = hour < 17
    ? new Date(d.getTime() - 24 * 60 * 60 * 1000) // yesterday
    : d;
  const dateStr = etDateOf(boundaryDate);

  // Build 17:00 ET estimate: assume EST (UTC-5) → 22:00 UTC
  const estimate = new Date(`${dateStr}T22:00:00Z`);
  // Verify by checking what ET hour that gives us
  const checkHour = etHourOf(estimate);
  // Correct for DST: if check=18 we're in EDT, shift back 1h
  const correctionMs = (checkHour - 17) * 3600_000;
  return new Date(estimate.getTime() - correctionMs);
}

/**
 * Convert ISO timestamp to forex trading day YYYY-MM-DD.
 * Trades at/after 17:00 ET belong to the NEXT calendar day.
 */
export function toForexDateKey(iso: string): string {
  const d = new Date(iso);
  const hour = etHourOf(d);
  // If 17:00 ET or later, shift to next day
  const adjusted = hour >= 17
    ? new Date(d.getTime() + 24 * 60 * 60 * 1000)
    : d;
  return etDateOf(adjusted);
}

/** "YYYY-MM" for the forex trading day of the given ISO timestamp. */
export function toForexMonthKey(iso: string): string {
  return toForexDateKey(iso).slice(0, 7);
}

/** { year, month0 } where month0 is 0-11, following JS Date convention. */
export function toForexMonthParts(iso: string): { year: number; month0: number } {
  const key = toForexDateKey(iso);
  return {
    year: Number(key.slice(0, 4)),
    month0: Number(key.slice(5, 7)) - 1,
  };
}

/**
 * Convert a forex date key (YYYY-MM-DD) to UTC 17:00 ET boundary timestamp.
 * Handles DST automatically.
 */
function forex17EtToUtc(dateKey: string): Date {
  // Estimate as EST (UTC-5): 17:00 ET ≈ 22:00 UTC
  const estimate = new Date(`${dateKey}T22:00:00Z`);
  const checkHour = etHourOf(estimate);
  // If we're in EDT (UTC-4), checkHour will be 18; shift back 1h
  const correctionMs = (checkHour - 17) * 3600_000;
  return new Date(estimate.getTime() - correctionMs);
}

/**
 * UTC bounds of a single forex trading day.
 * Forex day N = [17:00 ET of calendar N-1, 17:00 ET of calendar N).
 */
export function forexDayBoundsUtc(dateKey: string): { startUtc: string; endUtc: string } {
  const endDate = forex17EtToUtc(dateKey);
  const prevDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
  // Recompute precise 17:00 ET of previous day to handle DST transitions
  const prevKey = etDateOf(prevDate);
  const startDate = forex17EtToUtc(prevKey);
  return { startUtc: startDate.toISOString(), endUtc: endDate.toISOString() };
}

/**
 * UTC bounds covering the forex trading days of a calendar month grid.
 * Accepts the calendar month (year, month0) and returns the UTC window that
 * contains all trades whose forex-day falls within that month, plus a safety buffer.
 */
export function forexMonthBoundsUtc(year: number, month0: number): { startUtc: string; endUtc: string } {
  const firstKey = `${year}-${String(month0 + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const lastKey = `${year}-${String(month0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const { startUtc } = forexDayBoundsUtc(firstKey);
  const { endUtc } = forexDayBoundsUtc(lastKey);
  // Add ±6h buffer for safety (captures opened_at recorded slightly off)
  const start = new Date(new Date(startUtc).getTime() - 6 * 3600_000);
  const end = new Date(new Date(endUtc).getTime() + 6 * 3600_000);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}
