import type { MacroHeadline } from "../types";
import { callActor } from "../apify/client";
import { APIFY_ACTORS, HeadlineNewsItem } from "../apify/types";
import { hashString } from "./utils";

/**
 * Fetch Financial Juice headlines via Apify scraper.
 * Financial Juice uses SignalR/WebSocket making direct scraping impractical for cron.
 * Returns null on failure (never throws).
 */
export async function fetchFinancialJuiceHeadlines(): Promise<MacroHeadline[] | null> {
  try {
    console.log("[financial-juice] Fetching headlines via Apify...");

    const result = await callActor<HeadlineNewsItem>(
      APIFY_ACTORS.HEADLINE_NEWS,
      {
        urls: ["https://www.financialjuice.com"],
        includeImages: false,
        classifyWithAI: false,
        debug: false,
      },
      90_000
    );

    if (!result || result.items.length === 0) {
      console.warn("[financial-juice] No results from Apify");
      return null;
    }

    console.log(`[financial-juice] Got ${result.items.length} headlines`);

    return result.items
      .map((item) => {
        const title = (item.title || "").trim();
        const isBreaking = /breaking|urgente|alert/i.test(title);

        return {
          id: "",
          source: "financial_juice" as const,
          headline: title,
          summary: item.description?.slice(0, 500) || null,
          author: null,
          url: item.url || null,
          impact: isBreaking ? ("breaking" as const) : ("high" as const),
          published_at: item.publishedAt || null,
          fetched_at: new Date().toISOString(),
          external_id: item.url ? hashString(item.url) : null,
        };
      })
      .filter((h) => h.headline.length > 0);
  } catch (err) {
    console.error("[financial-juice] Error:", err);
    return null;
  }
}
