import type { MacroHeadline } from "../types";
import { fetchWithTimeout, hashString } from "./utils";

interface TENewsItem {
  id: number;
  title: string;
  description: string;
  date: string;
  country: string;
  category: string;
  symbol: string;
  url: string;
  importance: number;
}

/**
 * Fetch Trading Economics headlines via guest API with homepage fallback.
 * Returns null on failure (never throws).
 */
export async function fetchTradingEconomicsHeadlines(): Promise<MacroHeadline[] | null> {
  const apiResult = await fetchFromApi();
  if (apiResult && apiResult.length > 0) return apiResult;

  console.log("[trading-economics] API failed, trying homepage scrape...");
  return fetchFromHomepage();
}

async function fetchFromApi(): Promise<MacroHeadline[] | null> {
  try {
    console.log("[trading-economics] Fetching from guest API...");

    const res = await fetchWithTimeout(
      "https://api.tradingeconomics.com/news?c=guest:guest&limit=20",
      30_000,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NewsAggregator/1.0)",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      console.warn(`[trading-economics] API returned ${res.status}`);
      return null;
    }

    const items: TENewsItem[] = await res.json();
    if (!items || items.length === 0) {
      console.warn("[trading-economics] No items from API");
      return null;
    }

    console.log(`[trading-economics] Got ${items.length} items from API`);

    return items
      .filter((item) => item.title)
      .map((item) => ({
        id: "",
        source: "trading_economics" as const,
        headline: item.title.trim(),
        summary: item.description?.slice(0, 500) || null,
        author: null,
        url: item.url
          ? (item.url.startsWith("http") ? item.url : `https://tradingeconomics.com${item.url}`)
          : null,
        impact: item.importance >= 3 ? ("high" as const) : ("medium" as const),
        published_at: item.date || null,
        fetched_at: new Date().toISOString(),
        external_id: item.id ? String(item.id) : hashString(item.title),
      }));
  } catch (err) {
    console.error("[trading-economics] API error:", err);
    return null;
  }
}

async function fetchFromHomepage(): Promise<MacroHeadline[] | null> {
  try {
    const res = await fetchWithTimeout("https://tradingeconomics.com", 30_000, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    const headlines: MacroHeadline[] = [];

    $("a[href*='/news/']").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href") || "";

      if (title.length > 20 && title.length < 300 && !headlines.some((h) => h.headline === title)) {
        headlines.push({
          id: "",
          source: "trading_economics" as const,
          headline: title,
          summary: null,
          author: null,
          url: href.startsWith("http") ? href : `https://tradingeconomics.com${href}`,
          impact: "medium" as const,
          published_at: new Date().toISOString(),
          fetched_at: new Date().toISOString(),
          external_id: hashString(title + href),
        });
      }
    });

    if (headlines.length === 0) return null;

    console.log(`[trading-economics] Scraped ${headlines.length} headlines from homepage`);
    return headlines.slice(0, 20);
  } catch (err) {
    console.error("[trading-economics] Homepage scrape error:", err);
    return null;
  }
}
