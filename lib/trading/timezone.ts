/**
 * MT5 broker wall-time → UTC conversion.
 *
 * MT5 servers (FTMO, The5ers, ICMarkets, most prop firms) run in Europe/Athens:
 * EET (UTC+2) in winter, EEST (UTC+3) in summer. Hardcoding a fixed offset
 * breaks trades between late March and late October.
 *
 * This module uses `Intl.DateTimeFormat` to resolve the real offset at each
 * instant — DST-aware without maintenance.
 */

const BROKER_TZ_DEFAULT = "Europe/Athens";

/** Minutes to ADD to UTC to get wall time in `tz` at the given instant. */
function tzOffsetMinutes(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
  let hour = get("hour");
  if (hour === 24) hour = 0; // Intl uses "24:00:00" at midnight
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second")
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * Convert a wall-clock `Date` (built with local-TZ component constructors such as
 * `new Date(y, m-1, d, h, min, s)` or XLSX `cellDates`) to its true UTC ISO,
 * interpreting the wall components as broker-timezone time.
 *
 * Works regardless of the server's local timezone (Vercel = UTC, dev = BRT/etc.),
 * because we read back wall components via `getFullYear()/getMonth()/…`, which
 * reflect the same local TZ the Date was built with.
 */
export function mt5WallTimeToUtc(wallTime: Date, brokerTz: string = BROKER_TZ_DEFAULT): string {
  const y = wallTime.getFullYear();
  const mo = wallTime.getMonth();
  const d = wallTime.getDate();
  const h = wallTime.getHours();
  const min = wallTime.getMinutes();
  const s = wallTime.getSeconds();
  // Anchor the wall components as-if-UTC, then shift by the real broker offset.
  const wallAsUtc = new Date(Date.UTC(y, mo, d, h, min, s));
  const offsetMin = tzOffsetMinutes(wallAsUtc, brokerTz);
  return new Date(wallAsUtc.getTime() - offsetMin * 60000).toISOString();
}

/**
 * @deprecated Use `mt5WallTimeToUtc` — same contract, DST-aware.
 * Kept as a compatibility shim for existing imports.
 */
export function mt5ServerTimeToUtc(date: Date): string {
  return mt5WallTimeToUtc(date);
}

/**
 * @deprecated Hardcoded UTC+2 offset — incorrect under DST (EEST, late Mar–Oct).
 * Kept only so legacy imports don't break. Prefer `mt5WallTimeToUtc`.
 */
export const MT5_TO_UTC_MS = -2 * 60 * 60 * 1000;
