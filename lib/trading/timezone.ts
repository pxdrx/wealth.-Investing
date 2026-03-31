/**
 * MT5 server time offset.
 * MT5 servers run on UTC+2 (UTC+3 during DST). Standard offset: -2 hours to convert to UTC.
 * Used by HTML/XLSX parsers that parse local MT5 timestamps.
 * NOT needed for MetaAPI REST responses (they already return ISO UTC).
 */
export const MT5_TO_UTC_MS = -2 * 60 * 60 * 1000;

/** Convert an MT5 server timestamp (UTC+2) to UTC ISO string */
export function mt5ServerTimeToUtc(date: Date): string {
  const adjusted = new Date(date.getTime() + MT5_TO_UTC_MS);
  return adjusted.toISOString();
}
