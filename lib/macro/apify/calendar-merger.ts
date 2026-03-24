// lib/macro/apify/calendar-merger.ts
// Merges Investing.com calendar data (Previous/Forecast/Actual) into economic_events table

import { SupabaseClient } from "@supabase/supabase-js";
import { InvestingComCalendarEvent } from "./types";
import { EconomicEvent } from "../types";

interface MergeResult {
  matched: number;
  updated: number;
}

/** Map currency codes from Investing.com to ISO 2-letter country codes */
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  BRL: "BR",
  CAD: "CA",
  AUD: "AU",
  NZD: "NZ",
  CHF: "CH",
  MXN: "MX",
  CNY: "CN",
};

/** Parenthetical qualifiers to strip during normalization */
const PARENTHETICAL_QUALIFIERS =
  /\s*\((mom|qoq|yoy|prel|prelim|preliminary|final|flash|revised|sa|nsa|annualized)\)/gi;

/**
 * Normalize an event title for fuzzy matching.
 * Lowercases, removes parenthetical qualifiers, collapses whitespace, trims.
 */
function normalizeEventTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(PARENTHETICAL_QUALIFIERS, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check whether two event titles refer to the same economic indicator.
 * Uses substring containment and word-overlap heuristics.
 * Threshold: >60% word overlap (lower than TE merger since IC names can differ more).
 */
function titlesMatch(icTitle: string, dbTitle: string): boolean {
  const a = normalizeEventTitle(icTitle);
  const b = normalizeEventTitle(dbTitle);

  // Exact match after normalization
  if (a === b) return true;

  // Substring containment (either direction)
  if (a.includes(b) || b.includes(a)) return true;

  // Key economic terms — if both titles share one, it's very likely the same event
  const KEY_TERMS = ["payroll", "nfp", "cpi", "ppi", "gdp", "pmi", "fomc", "ecb", "boj", "employment", "inflation", "retail", "housing", "confidence", "manufacturing", "services", "trade balance", "jobless", "unemployment"];
  const sharedKey = KEY_TERMS.some((t) => a.includes(t) && b.includes(t));
  if (sharedKey) return true;

  // Word-overlap heuristic: >40% of words shared
  const wordsA = new Set(a.split(" ").filter((w) => w.length > 1));
  const wordsB = new Set(b.split(" ").filter((w) => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  wordsA.forEach((word) => {
    if (wordsB.has(word)) overlap++;
  });

  const minSize = Math.min(wordsA.size, wordsB.size);
  return overlap / minSize > 0.4;
}

/**
 * Resolve the ISO 2-letter country code from an Investing.com event.
 * The actor may provide a `currency` field (e.g. "USD") which we map.
 */
function resolveCountry(icEvent: InvestingComCalendarEvent): string | null {
  const currency = (icEvent.currency ?? "").toUpperCase().trim();
  if (currency && CURRENCY_TO_COUNTRY[currency]) {
    return CURRENCY_TO_COUNTRY[currency];
  }
  return null;
}

/**
 * Find the best matching DB event for an Investing.com event.
 * Matches on: country + date (exact) + fuzzy title.
 */
function findMatchingEvent(
  icEvent: InvestingComCalendarEvent,
  dbEvents: EconomicEvent[]
): EconomicEvent | null {
  const icCountry = resolveCountry(icEvent);
  if (!icCountry || !icEvent.date || !icEvent.event) return null;

  const candidates = dbEvents.filter((ev) => {
    // Country match
    if (ev.country !== icCountry) return false;
    // Date match: exact
    if (ev.date !== icEvent.date) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Try title matching — return first that matches
  for (const candidate of candidates) {
    if (titlesMatch(icEvent.event!, candidate.title)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Merge Investing.com calendar data into the economic_events Supabase table.
 *
 * For each IC event with actual/forecast/previous values, attempts to match
 * against existing DB events using country + date + fuzzy title matching.
 * Updates DB events with IC data only when IC value is non-empty and DB value is null.
 */
export async function mergeInvestingComActuals(
  icEvents: InvestingComCalendarEvent[],
  supabase: SupabaseClient,
  weekStart: string
): Promise<MergeResult> {
  const result: MergeResult = { matched: 0, updated: 0 };

  try {
    // Fetch all economic_events for the specified week
    const { data: dbEvents, error } = await supabase
      .from("economic_events")
      .select("id, event_uid, date, country, title, impact, actual, forecast, previous")
      .eq("week_start", weekStart);

    if (error) {
      console.warn("[calendar-merger] Failed to fetch events:", error.message);
      return result;
    }

    if (!dbEvents || dbEvents.length === 0) {
      console.log("[calendar-merger] No DB events found for week:", weekStart);
      return result;
    }

    // Filter IC events that have at least one useful value
    const usefulEvents = icEvents.filter(
      (e) =>
        e.event &&
        e.date &&
        ((e.actual !== null && e.actual !== undefined && e.actual !== "") ||
          (e.forecast !== null && e.forecast !== undefined && e.forecast !== "") ||
          (e.previous !== null && e.previous !== undefined && e.previous !== ""))
    );

    console.log(
      `[calendar-merger] Processing ${usefulEvents.length} IC events against ${dbEvents.length} DB events for week ${weekStart}`
    );

    for (const icEvent of usefulEvents) {
      try {
        const match = findMatchingEvent(icEvent, dbEvents as EconomicEvent[]);
        if (!match) {
          const icCountry = resolveCountry(icEvent);
          console.log(`[calendar-merger] No match for IC event: "${icEvent.event}" (${icCountry} ${icEvent.date})`);
          continue;
        }

        result.matched++;

        // Build update payload — only update if IC value is non-empty
        const updates: Record<string, string> = {};

        if (icEvent.actual && icEvent.actual.trim() !== "" && !match.actual) {
          updates.actual = icEvent.actual.trim();
        }
        if (icEvent.forecast && icEvent.forecast.trim() !== "" && !match.forecast) {
          updates.forecast = icEvent.forecast.trim();
        }
        if (icEvent.previous && icEvent.previous.trim() !== "" && !match.previous) {
          updates.previous = icEvent.previous.trim();
        }

        // Skip if nothing to update
        if (Object.keys(updates).length === 0) continue;

        updates.updated_at = new Date().toISOString();

        const { error: updateErr } = await supabase
          .from("economic_events")
          .update(updates)
          .eq("id", match.id);

        if (updateErr) {
          console.warn(
            `[calendar-merger] Failed to update event ${match.id}:`,
            updateErr.message
          );
          continue;
        }

        result.updated++;
      } catch (rowErr) {
        console.warn(
          `[calendar-merger] Error processing IC event "${icEvent.event}":`,
          rowErr
        );
      }
    }

    console.log(
      `[calendar-merger] Done: ${result.matched} matched, ${result.updated} updated`
    );
  } catch (err) {
    console.error("[calendar-merger] Unexpected error:", err);
  }

  return result;
}
