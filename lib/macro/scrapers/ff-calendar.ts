// lib/macro/scrapers/ff-calendar.ts
// ForexFactory calendar scraper — SOLE source for economic calendar data.
// Replaces Faireconomy completely.

import * as cheerio from "cheerio";
import { fetchWithTimeout } from "./utils";
import { getWeekStart } from "../constants";

const FF_CALENDAR_URL = "https://www.forexfactory.com/calendar";

/** Browser-like headers to avoid being blocked */
const FF_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Referer: "https://www.forexfactory.com/",
};

/** Currency code to 2-letter country mapping */
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  AUD: "AU",
  NZD: "NZ",
  CAD: "CA",
  CHF: "CH",
  CNY: "CN",
  BRL: "BR",
  MXN: "MX",
};

export interface FFCalendarEvent {
  event_uid: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM (UTC)
  country: string; // 2-letter
  title: string;
  impact: "high" | "medium" | "low";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  currency: string | null;
  week_start: string; // YYYY-MM-DD (Monday)
}

/**
 * Parse impact from ForexFactory icon classes.
 * Returns null for low impact or unrecognized (we filter those out).
 */
function parseImpact(
  iconHtml: string
): "high" | "medium" | "low" | null {
  if (iconHtml.includes("icon--ff-impact-red")) return "high";
  if (iconHtml.includes("icon--ff-impact-ora")) return "medium";
  if (iconHtml.includes("icon--ff-impact-yel")) return "low";
  return null; // holiday or non-economic
}

/**
 * Parse FF date string like "Mon Mar 24" into YYYY-MM-DD.
 * FF uses the current year context — infer year from proximity.
 */
function parseFFDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;

  const cleaned = dateStr.trim();
  // Format: "Mon Mar 24" or "Tue Mar 25"
  const match = cleaned.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i
  );
  if (!match) return null;

  const monthNames: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = monthNames[match[1]];
  const day = parseInt(match[2], 10);
  if (month === undefined || isNaN(day)) return null;

  // Determine year: use current year, but handle Dec/Jan boundary
  const now = new Date();
  let year = now.getFullYear();
  const currentMonth = now.getMonth();

  // If we're in Jan and event is in Dec, it was last year
  if (currentMonth <= 1 && month === 11) year--;
  // If we're in Dec and event is in Jan, it's next year
  if (currentMonth >= 10 && month === 0) year++;

  const d = new Date(year, month, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Parse FF time string like "8:30am" or "10:00pm" into HH:MM (ET).
 * FF displays times in US Eastern. We convert to UTC for storage.
 * Returns null for "All Day", "Tentative", or empty.
 */
function parseFFTime(timeStr: string): string | null {
  if (!timeStr || !timeStr.trim()) return null;
  const cleaned = timeStr.trim().toLowerCase();

  if (
    cleaned === "all day" ||
    cleaned === "tentative" ||
    cleaned === "day 1" ||
    cleaned === "day 2" ||
    cleaned === "day 3"
  ) {
    return null;
  }

  // Parse "8:30am" or "10:00pm" format
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];

  if (period === "am" && hours === 12) hours = 0;
  if (period === "pm" && hours !== 12) hours += 12;

  // Convert ET to UTC: ET is UTC-5 (EST) or UTC-4 (EDT)
  // Use a heuristic: March-November is EDT (UTC-4), else EST (UTC-5)
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const isDST = month >= 2 && month <= 10; // rough EDT: Mar-Nov
  const offsetHours = isDST ? 4 : 5;

  let utcHours = hours + offsetHours;
  if (utcHours >= 24) utcHours -= 24;

  return `${String(utcHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Clean a cell value — strip whitespace, return null if empty or non-breaking space.
 */
function cleanCellValue(text: string | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\u00a0/g, " ").trim();
  return cleaned === "" ? null : cleaned;
}

/**
 * Generate a deterministic event UID for dedup.
 * Matches the pattern from faireconomy.ts for backward compatibility.
 */
function generateEventUid(
  country: string,
  date: string,
  title: string
): string {
  const dateClean = date.replace(/[^0-9]/g, "").slice(0, 8);
  return `${country}-${dateClean}-${title}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 128);
}

/**
 * Scrape ForexFactory calendar page for current week's events.
 * Filters to medium and high impact only.
 *
 * @param url - Override URL (for testing). Defaults to FF calendar.
 * @param weekStartOverride - Force a specific week_start value.
 */
export async function scrapeForexFactoryCalendar(
  url: string = FF_CALENDAR_URL,
  weekStartOverride?: string
): Promise<FFCalendarEvent[]> {
  const res = await fetchWithTimeout(url, 15000, {
    headers: FF_HEADERS,
  });

  if (!res.ok) {
    throw new Error(
      `ForexFactory fetch failed: ${res.status} ${res.statusText}`
    );
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const events: FFCalendarEvent[] = [];
  let currentDate: string | null = null;

  // FF calendar uses a table with class "calendar__table"
  // Each row is either a date-separator or an event row
  $(".calendar__row").each((_i, row) => {
    const $row = $(row);

    // Check for date cell — FF sets date on the first row of each day
    const dateCell = $row.find(".calendar__date .date");
    const dateCellText = dateCell.text().trim();
    if (dateCellText) {
      const parsed = parseFFDate(dateCellText);
      if (parsed) currentDate = parsed;
    }

    // Skip rows without a current date context
    if (!currentDate) return;

    // Get event data cells
    const currencyCell = $row.find(".calendar__currency").text().trim();
    const impactCell = $row.find(".calendar__impact").html() || "";
    const titleCell = $row
      .find(".calendar__event-title")
      .text()
      .trim();

    // Skip rows without essential data
    if (!titleCell || !currencyCell) return;

    // Parse impact — skip non-economic events
    const impact = parseImpact(impactCell);
    if (!impact) return;

    // Filter: ONLY medium and high impact
    if (impact === "low") return;

    const timeText = $row.find(".calendar__time").text().trim();
    const time = parseFFTime(timeText);

    const country =
      CURRENCY_TO_COUNTRY[currencyCell.toUpperCase()] ||
      currencyCell.toUpperCase().slice(0, 2);

    const actual = cleanCellValue(
      $row.find(".calendar__actual").text()
    );
    const forecast = cleanCellValue(
      $row.find(".calendar__forecast").text()
    );
    const previous = cleanCellValue(
      $row.find(".calendar__previous").text()
    );

    const eventUid = generateEventUid(country, currentDate, titleCell);

    events.push({
      event_uid: eventUid,
      date: currentDate,
      time,
      country,
      title: titleCell,
      impact,
      forecast,
      previous,
      actual,
      currency: currencyCell.toUpperCase() || null,
      week_start: "", // will be set below
    });
  });

  // Determine week_start
  let weekStart = weekStartOverride;
  if (!weekStart && events.length > 0) {
    weekStart = getWeekStart(new Date(events[0].date + "T12:00:00"));
  }
  if (!weekStart) weekStart = getWeekStart();

  // Apply week_start to all events
  for (const event of events) {
    event.week_start = weekStart;
  }

  console.log(
    `[ff-calendar] Scraped ${events.length} medium/high impact events for week ${weekStart}`
  );

  return events;
}
