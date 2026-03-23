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
 */
export async function scrapeTeCalendarActuals(): Promise<TeCalendarRow[]> {
  try {
    const res = await fetch(TE_CALENDAR_URL, FETCH_OPTS);

    if (!res.ok) {
      console.warn(`[te-scraper] Calendar fetch failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const rows: TeCalendarRow[] = [];
    let currentDate = "";

    // TE calendar uses table#calendar or a main table within the calendar page
    const tableSelector = "table#calendar tbody tr, table.table tbody tr, #calendar tr";

    $(tableSelector).each((_, row) => {
      const $row = $(row);
      const cells = $row.find("td");

      // Skip header rows or rows with too few cells
      if (cells.length < 5) return;

      // Try to extract importance from sentiment indicator
      const sentimentCell = $row.find("td.calendar-sentiment, td[title]").last();
      const importanceRaw =
        sentimentCell.attr("title") ||
        $row.find("[data-value]").last().attr("data-value") ||
        $row.find(".calendar-bull, .bull").length.toString() ||
        "";

      // Try dedicated class-based extraction first
      const eventCell = $row.find("td.calendar-event, td.event").text().trim();
      const countryCell =
        $row.find("td.calendar-country").text().trim() ||
        $row.find("td img[alt]").first().attr("alt") ||
        "";

      if (eventCell) {
        // Class-based extraction (structured TE layout)
        const dateCell = $row.find("td.calendar-date").text().trim();
        if (dateCell) currentDate = dateCell;

        rows.push({
          date: currentDate,
          time: cleanCell($row.find("td.calendar-time, td:nth-child(2)").text()),
          country: countryCell.trim(),
          title: eventCell,
          actual: cleanCell(
            $row.find("td.calendar-actual, td.actual").text() ||
              cells.eq(cells.length - 4).text()
          ),
          previous: cleanCell(
            $row.find("td.calendar-previous, td.previous").text() ||
              cells.eq(cells.length - 3).text()
          ),
          forecast: cleanCell(
            $row.find("td.calendar-consensus, td.consensus, td.forecast").text() ||
              cells.eq(cells.length - 2).text()
          ),
          importance: parseImportance(importanceRaw),
        });
      } else {
        // Position-based extraction fallback
        // Typical order: Date | Time | Country(flag) | Event | Actual | Previous | Consensus | Forecast | Impact
        const dateText = cleanCell(cells.eq(0).text());
        if (dateText && dateText.length > 3) currentDate = dateText;

        const title = cleanCell(cells.eq(3).text()) || cleanCell(cells.eq(2).text());
        if (!title) return;

        // Extract country from flag image alt or cell text
        const country =
          cells.eq(2).find("img[alt]").attr("alt") ||
          cleanCell(cells.eq(2).text()) ||
          "";

        rows.push({
          date: currentDate,
          time: cleanCell(cells.eq(1).text()),
          country: country.trim(),
          title,
          actual: cleanCell(cells.eq(4).text()),
          previous: cleanCell(cells.eq(5).text()),
          forecast: cleanCell(cells.eq(6).text()),
          importance: parseImportance(importanceRaw),
        });
      }
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
