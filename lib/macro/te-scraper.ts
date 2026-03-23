// lib/macro/te-scraper.ts
import * as cheerio from "cheerio";
import type { TeCalendarRow, TeHeadline, TeEnrichedBriefing } from "./types";

const TE_CALENDAR_URL = "https://tradingeconomics.com/calendar";
const TE_HOME_URL = "https://tradingeconomics.com/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const FETCH_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
};

const FETCH_OPTS = {
  headers: FETCH_HEADERS,
  next: { revalidate: 0 },
} as RequestInit;

/**
 * Parse importance from various TE indicator formats.
 * TE uses star/bull icons or sentiment classes with title attributes.
 */
function parseImportance(raw: string): "high" | "medium" | "low" {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("high") || lower.includes("3") || lower.includes("three")) return "high";
  if (lower.includes("medium") || lower.includes("2") || lower.includes("two")) return "medium";
  return "low";
}

/**
 * Clean cell text: trim whitespace and non-breaking spaces.
 */
function cleanCell(text: string): string | null {
  const cleaned = text.replace(/\u00a0/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Scrape TradingEconomics calendar for actual economic data releases.
 * Parses the HTML table by column position within each <tr>.
 * @param weekStart - Optional date string (YYYY-MM-DD) to fetch a specific week
 */
export async function scrapeTeCalendarActuals(weekStart?: string): Promise<TeCalendarRow[]> {
  try {
    // Add date parameter to fetch specific week's data
    const url = weekStart
      ? `${TE_CALENDAR_URL}?day=${weekStart}`
      : TE_CALENDAR_URL;
    const res = await fetch(url, FETCH_OPTS);

    if (!res.ok) {
      console.warn(`[te-scraper] Calendar fetch failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const rows: TeCalendarRow[] = [];
    let currentDate = "";

    // TE calendar structure (verified via Playwright):
    // - Header rows (th): Date | Actual | Previous | Consensus | Forecast
    // - Data rows (td): Time[0] | Country[1] | Event[2] | Actual[3] | Previous[4] | Ticker[5] | Consensus[6] | Forecast[7] | Alert[8]
    // Date header rows are in separate <tbody>/<rowgroup> elements

    $("table tr").each((_, row) => {
      const $row = $(row);

      // Check if this is a date header row (has <th> with date text)
      const headerCells = $row.find("th");
      if (headerCells.length > 0) {
        const dateText = headerCells.first().text().trim();
        // Date headers look like "Monday March 23 2026"
        if (dateText && /\w+ \w+ \d+ \d{4}/.test(dateText)) {
          // Parse "Monday March 23 2026" → "2026-03-23"
          try {
            const d = new Date(dateText.replace(/^\w+ /, "")); // remove day name
            if (!isNaN(d.getTime())) {
              currentDate = d.toISOString().split("T")[0];
            }
          } catch { /* keep previous date */ }
        }
        return; // skip header rows
      }

      const cells = $row.find("td");
      if (cells.length < 5) return; // skip short rows

      // Extract event title from cell[2] (link text or cell text)
      const eventCell = cells.eq(2);
      const title = eventCell.find("a").first().text().trim() || cleanCell(eventCell.text());
      if (!title) return;

      // Extract country from cell[1] — nested table with country name + code
      const countryCell = cells.eq(1);
      const countryCode = countryCell.find("td").last().text().trim() || // 2-letter code in nested table
        countryCell.find("img[alt]").first().attr("alt")?.slice(0, 2).toUpperCase() ||
        countryCell.text().trim().slice(-2).toUpperCase();

      // Extract values: Actual[3], Previous[4], Consensus[6], Forecast[7]
      const actual = cleanCell(cells.eq(3).text());
      const previous = cleanCell(cells.eq(4).text());
      const consensus = cleanCell(cells.eq(6).text());
      const forecast = cleanCell(cells.eq(7).text());

      // Importance: check for star/bull indicators or data-importance attribute
      const importanceRaw =
        $row.attr("data-importance") ||
        $row.find("[title*='High'], [title*='Medium'], [title*='Low']").attr("title") ||
        cells.last().find("i, span").length.toString() || // count star icons
        "";

      rows.push({
        date: currentDate,
        time: cleanCell(cells.eq(0).text()),
        country: countryCode.slice(0, 2),
        title,
        actual,
        previous,
        forecast: consensus || forecast, // TE calls it "Consensus", our DB calls it "forecast"
        importance: parseImportance(importanceRaw),
      });
    });

    console.log(`[te-scraper] Extracted ${rows.length} calendar rows`);
    return rows;
  } catch (error) {
    console.warn("[te-scraper] Calendar scraping failed:", error);
    return [];
  }
}

/**
 * Scrape TradingEconomics homepage for latest news headlines.
 * Returns up to 10 headlines with timestamps.
 */
export async function scrapeTeHeadlines(): Promise<TeHeadline[]> {
  try {
    const res = await fetch(TE_HOME_URL, FETCH_OPTS);

    if (!res.ok) {
      console.warn(`[te-scraper] Headlines fetch failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const headlines: TeHeadline[] = [];

    // TE homepage has a news stream/feed section with links
    const newsSelectors = [
      ".stream-item",
      ".news-item",
      ".te-stream a",
      "#news a",
      ".list-group-item",
      "a[href*='/news/']",
      ".card-body a",
    ];

    for (const selector of newsSelectors) {
      $(selector).each((_, el) => {
        if (headlines.length >= 10) return false; // break

        const $el = $(el);
        const title = cleanCell($el.text()) || cleanCell($el.attr("title") || "");
        if (!title || title.length < 10) return; // skip short/empty

        // Avoid duplicates
        if (headlines.some((h) => h.title === title)) return;

        const timestamp =
          $el.find("time").attr("datetime") ||
          $el.find(".date, .timestamp, .time").text().trim() ||
          $el.parent().find("time").attr("datetime") ||
          null;

        headlines.push({ title, timestamp });
      });

      if (headlines.length >= 10) break;
    }

    console.log(`[te-scraper] Extracted ${headlines.length} headlines`);
    return headlines.slice(0, 10);
  } catch (error) {
    console.warn("[te-scraper] Headlines scraping failed:", error);
    return [];
  }
}

/**
 * Scrape TradingEconomics "Week Ahead" editorial content.
 * If articleUrl is provided, fetches that directly.
 * Otherwise searches the calendar page for a week-ahead link.
 */
export async function scrapeTeWeekAhead(articleUrl?: string): Promise<string | null> {
  try {
    let targetUrl = articleUrl;

    if (!targetUrl) {
      // Search calendar page for week-ahead link
      const res = await fetch(TE_CALENDAR_URL, FETCH_OPTS);
      if (!res.ok) {
        console.warn(`[te-scraper] Week ahead: calendar fetch failed: ${res.status}`);
        return null;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // Look for links containing "week" and "ahead"
      $("a").each((_, el) => {
        if (targetUrl) return false;
        const href = $(el).attr("href") || "";
        const text = $(el).text().toLowerCase();
        if (
          (text.includes("week") && text.includes("ahead")) ||
          (href.includes("week") && href.includes("ahead"))
        ) {
          targetUrl = href.startsWith("http") ? href : `https://tradingeconomics.com${href}`;
        }
      });
    }

    if (!targetUrl) {
      console.warn("[te-scraper] No week-ahead article URL found");
      return null;
    }

    const res = await fetch(targetUrl, FETCH_OPTS);
    if (!res.ok) {
      console.warn(`[te-scraper] Week ahead article fetch failed: ${res.status}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract editorial from meta description tags
    const editorial =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      null;

    if (editorial) {
      console.log(`[te-scraper] Week ahead editorial: ${editorial.length} chars`);
    } else {
      console.warn("[te-scraper] No week-ahead editorial found in meta tags");
    }

    return editorial || null;
  } catch (error) {
    console.warn("[te-scraper] Week ahead scraping failed:", error);
    return null;
  }
}

/**
 * Orchestrator: scrape all TE data sources and combine into enriched briefing.
 * Each sub-function fails gracefully so partial data is still returned.
 */
export async function scrapeTeBriefing(): Promise<TeEnrichedBriefing> {
  const [calendarActuals, headlines, weekAheadEditorial] = await Promise.allSettled([
    scrapeTeCalendarActuals(),
    scrapeTeHeadlines(),
    scrapeTeWeekAhead(),
  ]);

  const calendar = calendarActuals.status === "fulfilled" ? calendarActuals.value : [];
  const heads = headlines.status === "fulfilled" ? headlines.value : [];
  const editorial = weekAheadEditorial.status === "fulfilled" ? weekAheadEditorial.value : null;

  // Build raw_text from all available data
  const parts: string[] = [];
  if (editorial) parts.push(editorial);
  if (heads.length > 0) parts.push(heads.map((h) => h.title).join("\n"));
  if (calendar.length > 0) {
    const highImpact = calendar
      .filter((r) => r.importance === "high")
      .map((r) => `${r.country}: ${r.title}`)
      .join("\n");
    if (highImpact) parts.push(highImpact);
  }

  return {
    calendar_actuals: calendar,
    headlines: heads,
    week_ahead_editorial: editorial,
    raw_text: parts.join("\n\n"),
  };
}
