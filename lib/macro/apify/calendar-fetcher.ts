// lib/macro/apify/calendar-fetcher.ts
// Fetches economic calendar data from Investing.com via Apify actor

import { callActor } from "./client";
import { InvestingComCalendarEvent, APIFY_ACTORS } from "./types";

/**
 * Fetch economic calendar events from Investing.com for a date range.
 * Uses the pintostudio/economic-calendar-data-investing-com Apify actor.
 * No country filter — fetches all countries in one run (cheaper).
 * Returns null on any failure (never throws).
 */
export async function fetchInvestingComCalendar(
  fromDate: string, // YYYY-MM-DD
  toDate: string     // YYYY-MM-DD
): Promise<InvestingComCalendarEvent[] | null> {
  try {
    console.log(`[calendar-fetcher] Fetching Investing.com calendar: ${fromDate} to ${toDate}`);

    const result = await callActor<InvestingComCalendarEvent>(
      APIFY_ACTORS.INVESTING_CALENDAR,
      {
        fromDate,
        toDate,
      },
      120_000 // 120s timeout
    );

    if (!result) {
      console.warn("[calendar-fetcher] Apify actor returned null (failure or timeout)");
      return null;
    }

    console.log(
      `[calendar-fetcher] Got ${result.items.length} events in ${Math.round(result.durationMs / 1000)}s`
    );

    return result.items;
  } catch (err) {
    console.error("[calendar-fetcher] Unexpected error:", err);
    return null;
  }
}
