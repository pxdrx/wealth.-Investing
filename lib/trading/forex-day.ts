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
