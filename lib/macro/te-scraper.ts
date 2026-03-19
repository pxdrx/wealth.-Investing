// lib/macro/te-scraper.ts
import * as cheerio from "cheerio";

const TE_CALENDAR_URL = "https://tradingeconomics.com/calendar";

export interface TeBriefingResult {
  raw_html: string;
  text_content: string;
  top_events: string[];
}

/**
 * Scrape TradingEconomics calendar page for high-importance events.
 * Used as editorial context for Claude narrative generation.
 * Falls back gracefully if scraping fails.
 */
export async function scrapeTeBriefing(): Promise<TeBriefingResult | null> {
  try {
    const res = await fetch(TE_CALENDAR_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[te-scraper] Failed to fetch TE: ${res.status}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract table rows with economic events
    const topEvents: string[] = [];
    $("table#calendar tbody tr").each((_, row) => {
      const importance = $(row).find("td.calendar-sentiment").attr("title") || "";
      if (importance.toLowerCase().includes("high") || importance.includes("3")) {
        const country = $(row).find("td.calendar-country").text().trim();
        const event = $(row).find("td.calendar-event").text().trim();
        if (event) {
          topEvents.push(`${country}: ${event}`);
        }
      }
    });

    // Extract any article/editorial content
    const articleText = $(".calendar-article, .te-article, article").text().trim();

    return {
      raw_html: html.slice(0, 50000), // Limit storage
      text_content: articleText || topEvents.join("\n"),
      top_events: topEvents.slice(0, 20),
    };
  } catch (error) {
    console.warn("[te-scraper] Scraping failed:", error);
    return null;
  }
}
