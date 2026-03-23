// lib/macro/actuals-merger.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { TeCalendarRow, EconomicEvent } from "./types";
import { getWeekStart } from "./constants";

interface SurpriseEntry {
  eventId: string;
  title: string;
  actual: string;
  forecast: string;
}

interface MergeResult {
  updated: number;
  surprises: SurpriseEntry[];
}

/**
 * Merge TradingEconomics actual values into the economic_events Supabase table.
 *
 * For each TE row with an `actual` value, attempts to match against existing
 * DB events using normalized country + date + fuzzy title matching. Updates
 * actuals (and backfills forecast/previous if missing). Returns a list of
 * significant surprises (HIGH impact events where actual diverges >10% from
 * forecast) so callers can trigger narrative refreshes.
 */
export async function mergeTeActuals(
  teRows: TeCalendarRow[],
  supabase: SupabaseClient
): Promise<MergeResult> {
  const result: MergeResult = { updated: 0, surprises: [] };

  try {
    const weekStart = getWeekStart();

    // Fetch all economic_events for the current week
    const { data: dbEvents, error } = await supabase
      .from("economic_events")
      .select("id, event_uid, date, country, title, impact, actual, forecast, previous")
      .eq("week_start", weekStart);

    if (error) {
      console.warn("[actuals-merger] Failed to fetch events:", error.message);
      return result;
    }

    if (!dbEvents || dbEvents.length === 0) {
      return result;
    }

    // Filter TE rows that have an actual value
    const rowsWithActual = teRows.filter((r) => r.actual !== null && r.actual !== "");

    for (const teRow of rowsWithActual) {
      try {
        const match = findMatchingEvent(teRow, dbEvents as EconomicEvent[]);
        if (!match) continue;

        // Skip if DB already has the same actual
        if (match.actual === teRow.actual) continue;

        // Build update payload
        const updates: Record<string, string> = {
          actual: teRow.actual!,
          updated_at: new Date().toISOString(),
        };

        // Backfill forecast and previous if DB values are null
        if (match.forecast === null && teRow.forecast) {
          updates.forecast = teRow.forecast;
        }
        if (match.previous === null && teRow.previous) {
          updates.previous = teRow.previous;
        }

        const { error: updateErr } = await supabase
          .from("economic_events")
          .update(updates)
          .eq("id", match.id);

        if (updateErr) {
          console.warn(
            `[actuals-merger] Failed to update event ${match.id}:`,
            updateErr.message
          );
          continue;
        }

        result.updated++;

        // Check for significant surprise on HIGH impact events
        const forecastVal = teRow.forecast ?? match.forecast;
        if (
          match.impact === "high" &&
          forecastVal &&
          teRow.actual &&
          isSignificantSurprise(teRow.actual, forecastVal)
        ) {
          result.surprises.push({
            eventId: match.id,
            title: match.title,
            actual: teRow.actual,
            forecast: forecastVal,
          });
        }
      } catch (rowErr) {
        console.warn(
          `[actuals-merger] Error processing TE row "${teRow.title}":`,
          rowErr
        );
      }
    }
  } catch (err) {
    console.error("[actuals-merger] Unexpected error:", err);
  }

  return result;
}

/**
 * Find the best matching DB event for a given TE row.
 * Matches on: country (first 2 chars, uppercase) + date (exact) + fuzzy title.
 */
function findMatchingEvent(
  teRow: TeCalendarRow,
  dbEvents: EconomicEvent[]
): EconomicEvent | null {
  const teCountry = teRow.country.slice(0, 2).toUpperCase();

  const candidates = dbEvents.filter((ev) => {
    // Country match: first 2 chars, case-insensitive
    const dbCountry = ev.country.slice(0, 2).toUpperCase();
    if (dbCountry !== teCountry) return false;

    // Date match: exact
    if (ev.date !== teRow.date) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  // Try title matching — return first that matches
  for (const candidate of candidates) {
    if (titlesMatch(teRow.title, candidate.title)) {
      return candidate;
    }
  }

  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
 * Uses substring containment and word-overlap heuristics since
 * TradingEconomics and Faireconomy may name events differently.
 */
function titlesMatch(teTitle: string, dbTitle: string): boolean {
  const a = normalizeEventTitle(teTitle);
  const b = normalizeEventTitle(dbTitle);

  // Exact match after normalization
  if (a === b) return true;

  // Substring containment (either direction)
  if (a.includes(b) || b.includes(a)) return true;

  // Word-overlap heuristic: >80% of words shared
  const wordsA = new Set(a.split(" ").filter((w) => w.length > 1));
  const wordsB = new Set(b.split(" ").filter((w) => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  wordsA.forEach((word) => {
    if (wordsB.has(word)) overlap++;
  });

  const minSize = Math.min(wordsA.size, wordsB.size);
  return overlap / minSize > 0.8;
}

/**
 * Determine whether an actual value diverges significantly from the forecast.
 * Returns true if the percentage deviation exceeds 10%.
 * Returns false if either value cannot be parsed as a number.
 */
function isSignificantSurprise(actual: string, forecast: string): boolean {
  const actualNum = parseNumericValue(actual);
  const forecastNum = parseNumericValue(forecast);

  if (actualNum === null || forecastNum === null) return false;

  // Avoid division by zero — if forecast is 0, any non-zero actual is a surprise
  if (forecastNum === 0) return actualNum !== 0;

  const deviation = Math.abs(actualNum - forecastNum) / Math.abs(forecastNum);
  return deviation > 0.1;
}

/**
 * Parse a string that may contain percentage signs, K/M/B suffixes, or
 * other non-numeric characters into a plain number.
 */
function parseNumericValue(value: string): number | null {
  // Strip common suffixes/prefixes
  const cleaned = value
    .replace(/[%$,]/g, "")
    .replace(/\s/g, "")
    .trim();

  // Handle K/M/B suffixes
  const suffixMatch = cleaned.match(/^(-?[\d.]+)\s*([KMBkmb])?$/);
  if (!suffixMatch) return null;

  let num = parseFloat(suffixMatch[1]);
  if (isNaN(num)) return null;

  const suffix = (suffixMatch[2] ?? "").toUpperCase();
  if (suffix === "K") num *= 1_000;
  else if (suffix === "M") num *= 1_000_000;
  else if (suffix === "B") num *= 1_000_000_000;

  return num;
}
