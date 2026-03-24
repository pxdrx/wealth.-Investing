import type { MacroHeadline } from "../types";
import { fetchWithTimeout, hashString, stripHtml } from "./utils";

// RSS Feed URLs
const FEEDS = {
  forexlive: "https://www.forexlive.com/feed",
  fxstreet: "https://www.fxstreet.com/rss",
} as const;

// Keywords that indicate market-moving content
const HIGH_IMPACT_KEYWORDS =
  /\b(rate|CPI|NFP|GDP|FOMC|Fed|ECB|BoJ|BoE|tariff|trade war|oil|gold|bitcoin|crypto|inflation|employment|PMI|ISM|retail sales|housing|PPI|PCE|treasury|yield|dollar|euro|yen|pound|franc|central bank|monetary policy|recession|stimulus|sanctions|war|geopolitical)\b/i;

// Keywords to EXCLUDE (noise)
const EXCLUDE_KEYWORDS =
  /\b(sponsored|advertisement|partner content|webinar|course|academy|broker review|sign up|subscribe now)\b/i;

export async function fetchForexLiveHeadlines(): Promise<MacroHeadline[] | null> {
  return fetchRSSHeadlines(FEEDS.forexlive, "forexlive");
}

export async function fetchFXStreetHeadlines(): Promise<MacroHeadline[] | null> {
  return fetchRSSHeadlines(FEEDS.fxstreet, "fxstreet");
}

export async function fetchReutersHeadlines(): Promise<MacroHeadline[] | null> {
  try {
    console.log("[reuters] Fetching headlines...");

    const res = await fetchWithTimeout("https://www.reuters.com/markets/", 30_000, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      console.warn(`[reuters] Returned ${res.status}`);
      return null;
    }

    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    const items: MacroHeadline[] = [];

    // Reuters markets page has article headlines in various patterns
    $("a[href*='/markets/'], a[href*='/business/']").each((_, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const href = $el.attr("href") || "";

      // Filter by length and relevance
      if (title.length < 20 || title.length > 300) return;
      if (!HIGH_IMPACT_KEYWORDS.test(title)) return;
      if (EXCLUDE_KEYWORDS.test(title)) return;
      if (items.some((h) => h.headline === title)) return; // dedup

      const fullUrl = href.startsWith("http") ? href : `https://www.reuters.com${href}`;

      items.push({
        id: "",
        source: "reuters",
        headline: title,
        summary: null,
        author: null,
        url: fullUrl,
        impact: "high",
        published_at: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
        external_id: hashString(fullUrl),
      });
    });

    console.log(`[reuters] Scraped ${items.length} relevant headlines`);
    return items.length > 0 ? items.slice(0, 15) : null;
  } catch (err) {
    console.error("[reuters] Error:", err);
    return null;
  }
}

async function fetchRSSHeadlines(
  feedUrl: string,
  source: string
): Promise<MacroHeadline[] | null> {
  try {
    console.log(`[rss-headlines] Fetching ${source}...`);

    const res = await fetchWithTimeout(feedUrl, 30_000, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsAggregator/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!res.ok) {
      console.warn(`[rss-headlines] ${source} returned ${res.status}`);
      return null;
    }

    const xml = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(xml, { xml: true });

    const items: MacroHeadline[] = [];

    $("item").each((_, el) => {
      const title = stripHtml($(el).find("title").text().trim());
      const link = $(el).find("link").text().trim();
      const pubDate = $(el).find("pubDate").text().trim();
      const description = stripHtml($(el).find("description").text().trim());

      if (!title) return;

      // Filter: only market-moving content
      const fullText = `${title} ${description}`;
      if (!HIGH_IMPACT_KEYWORDS.test(fullText)) return;
      if (EXCLUDE_KEYWORDS.test(fullText)) return;

      const isBreaking = /breaking|urgente|alert|flash/i.test(title);

      items.push({
        id: "",
        source: source as MacroHeadline["source"],
        headline: title,
        summary: description?.slice(0, 500) || null,
        author: null,
        url: link || null,
        impact: isBreaking ? "breaking" : "high",
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        fetched_at: new Date().toISOString(),
        external_id: link ? hashString(link) : hashString(title),
      });
    });

    console.log(`[rss-headlines] ${source}: got ${items.length} relevant headlines`);
    return items.length > 0 ? items : null;
  } catch (err) {
    console.error(`[rss-headlines] ${source} error:`, err);
    return null;
  }
}
