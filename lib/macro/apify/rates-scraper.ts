// lib/macro/apify/rates-scraper.ts
// Fetches central bank interest rates from TradingEconomics via Apify RAG browser

import { callActor } from "./client";
import { APIFY_ACTORS, BANK_CODE_TO_TE_SLUG } from "./types";
import type { CentralBankRate } from "../types";
import { CENTRAL_BANKS } from "../constants";

/** TE country-list page with all interest rates in one table */
const TE_RATES_LIST_URL = "https://tradingeconomics.com/country-list/interest-rate";

/** Map TE country names → bank codes */
const COUNTRY_NAME_TO_BANK: Record<string, string> = {
  "united states": "FED",
  "euro area": "ECB",
  "united kingdom": "BOE",
  "japan": "BOJ",
  "brazil": "BCB",
  "canada": "BOC",
  "australia": "RBA",
  "china": "PBOC",
  "switzerland": "SNB",
  "mexico": "BANXICO",
};

interface RagBrowserItem {
  markdown?: string;
  metadata?: { title?: string; url?: string };
}

/**
 * Fetch all central bank rates from TE's country-list/interest-rate page.
 * Single RAG browser call → parse markdown table → extract rates.
 * Returns null on failure (callers should fallback to hardcoded).
 */
export async function fetchRatesViaApify(): Promise<Omit<CentralBankRate, "id">[] | null> {
  const result = await callActor<RagBrowserItem>(
    APIFY_ACTORS.RAG_WEB_BROWSER,
    {
      query: TE_RATES_LIST_URL,
      maxResults: 1,
      outputFormats: ["markdown"],
    },
    60_000
  );

  if (!result || result.items.length === 0) {
    console.warn("[rates-scraper] RAG browser returned no results");
    return null;
  }

  const markdown = result.items[0].markdown;
  if (!markdown) {
    console.warn("[rates-scraper] RAG browser returned empty markdown");
    return null;
  }

  return parseRatesFromMarkdown(markdown);
}

/**
 * Also fetch individual country rate page for more details (last action, next meeting).
 * Used to enrich the basic rate from the list page.
 */
export async function fetchSingleRateViaApify(
  bankCode: string
): Promise<{ currentRate: number; lastAction?: string; nextMeeting?: string } | null> {
  const slug = BANK_CODE_TO_TE_SLUG[bankCode];
  if (!slug) return null;

  const url = `https://tradingeconomics.com/${slug}/interest-rate`;
  const result = await callActor<RagBrowserItem>(
    APIFY_ACTORS.RAG_WEB_BROWSER,
    { query: url, maxResults: 1, outputFormats: ["markdown"] },
    45_000
  );

  if (!result || result.items.length === 0) return null;
  const md = result.items[0].markdown;
  if (!md) return null;

  // Parse "was last recorded at X percent"
  const rateMatch = md.match(/last recorded at ([\d.]+)\s*percent/i);
  if (!rateMatch) return null;

  const currentRate = parseFloat(rateMatch[1]);
  if (isNaN(currentRate)) return null;

  // Try to extract next meeting from calendar table
  const now = new Date();
  const meetingMatch = md.match(/(\d{4}-\d{2}-\d{2}).*?Interest Rate Decision.*?\|.*?\|.*?\|/g);
  let nextMeeting: string | undefined;
  if (meetingMatch) {
    for (const m of meetingMatch) {
      const dateMatch = m.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch && new Date(dateMatch[1]) > now) {
        nextMeeting = dateMatch[1];
        break;
      }
    }
  }

  return { currentRate, nextMeeting };
}

/**
 * Parse the markdown table from TE country-list/interest-rate.
 * Expected format: "| [Country](/country/interest-rate) | Rate | ... |"
 */
function parseRatesFromMarkdown(markdown: string): Omit<CentralBankRate, "id">[] | null {
  const rates: Omit<CentralBankRate, "id">[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    // Match lines like "| [Brazil](/brazil/interest-rate) | 14.75 | ..."
    // or "| Brazil | 14.75 | ..."
    const match = line.match(
      /\|\s*(?:\[([^\]]+)\](?:\([^)]*\))?|([^|]+?))\s*\|\s*([-\d.]+)\s*\|/
    );
    if (!match) continue;

    const countryName = (match[1] || match[2] || "").trim();
    const rateStr = match[3]?.trim();
    if (!countryName || !rateStr) continue;

    const rate = parseFloat(rateStr);
    if (isNaN(rate)) continue;

    const bankCode = COUNTRY_NAME_TO_BANK[countryName.toLowerCase()];
    if (!bankCode) continue; // Not a tracked central bank

    const cb = CENTRAL_BANKS.find((b) => b.code === bankCode);
    if (!cb) continue;

    rates.push({
      bank_code: bankCode,
      bank_name: cb.name,
      country: cb.country,
      current_rate: rate,
      last_action: null,       // Not available from list page
      last_change_bps: null,
      last_change_date: null,
      next_meeting: null,
      updated_at: new Date().toISOString(),
    });
  }

  if (rates.length === 0) {
    console.warn("[rates-scraper] Could not parse any rates from markdown");
    return null;
  }

  console.log(`[rates-scraper] Parsed ${rates.length} rates from TE country-list`);
  return rates;
}
