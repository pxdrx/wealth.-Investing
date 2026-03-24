import type { MacroHeadline } from "../types";
import { fetchWithTimeout, hashString, stripHtml } from "./utils";

// RSS Feed URLs — primary + fallback for each source
const FEEDS = {
  forexlive: [
    "https://www.forexlive.com/feed",
    "https://www.forexlive.com/feed/",
  ],
  fxstreet: [
    "https://www.fxstreet.com/rss/news",
    "https://www.fxstreet.com/rss",
  ],
  // Google News RSS as reliable replacement for Reuters (which returns 401)
  googlenews: [
    "https://news.google.com/rss/search?q=forex+OR+gold+OR+bitcoin+OR+fed+OR+tariff+OR+treasury+when:1d&hl=en",
  ],
} as const;

// Keywords that indicate market-moving content (expanded for better recall)
const HIGH_IMPACT_KEYWORDS =
  /\b(rate|rates|CPI|NFP|GDP|FOMC|Fed|ECB|BoJ|BoE|RBA|SNB|BoC|RBNZ|tariff|tariffs|trade war|trade deal|oil|crude|WTI|Brent|gold|silver|copper|bitcoin|BTC|ETH|crypto|inflation|deflation|employment|jobs|unemployment|PMI|ISM|retail sales|housing|PPI|PCE|treasury|treasuries|yield|yields|bond|bonds|dollar|DXY|euro|EUR|yen|JPY|pound|GBP|franc|CHF|AUD|NZD|CAD|central bank|monetary policy|recession|stimulus|sanctions|war|geopolitical|stock|stocks|market|markets|economy|economic|bank|banking|policy|trade|export|import|China|Russia|Ukraine|Iran|OPEC|Nasdaq|S&P|Dow|equities|rally|crash|surge|plunge|cut|hike|dovish|hawkish|risk|volatility|VIX|forex|FX|currency|commodit)\b/i;

// Keywords to EXCLUDE (noise)
const EXCLUDE_KEYWORDS =
  /\b(sponsored|advertisement|partner content|webinar|course|academy|broker review|sign up|subscribe now|open account|demo account|trading platform review)\b/i;

/**
 * Try fetching from a list of URLs, return first successful response.
 */
async function fetchWithFallback(
  urls: readonly string[],
  source: string,
  headers: Record<string, string>
): Promise<Response | null> {
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, 15_000, { headers });
      if (res.ok) {
        console.log(`[rss-headlines] ${source}: ${url} returned ${res.status}`);
        return res;
      }
      console.warn(`[rss-headlines] ${source}: ${url} returned ${res.status}, trying next...`);
    } catch (err) {
      console.warn(`[rss-headlines] ${source}: ${url} failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  return null;
}

export async function fetchForexLiveHeadlines(): Promise<MacroHeadline[] | null> {
  return fetchRSSHeadlines(FEEDS.forexlive, "forexlive");
}

export async function fetchFXStreetHeadlines(): Promise<MacroHeadline[] | null> {
  return fetchRSSHeadlines(FEEDS.fxstreet, "fxstreet");
}

export async function fetchReutersHeadlines(): Promise<MacroHeadline[] | null> {
  // Reuters blocks server-side requests (returns 401).
  // Use Google News RSS filtered for financial keywords as a reliable replacement.
  try {
    console.log("[reuters] Fetching via Google News RSS...");

    const res = await fetchWithFallback(
      FEEDS.googlenews,
      "reuters-via-google",
      {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      }
    );

    if (!res) {
      console.warn("[reuters] Google News RSS also failed");
      return null;
    }

    const xml = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(xml, { xml: true });

    const items: MacroHeadline[] = [];

    $("item").each((_, el) => {
      const title = stripHtml($(el).find("title").text().trim());
      // Google News RSS uses <link> tag — extract text or next sibling text node
      let link = $(el).find("link").text().trim();
      // In some cheerio versions, <link> self-closing tag text is empty;
      // the URL appears as a text node right after <link/>
      if (!link) {
        const linkNode = $(el).find("link");
        const nextNode = linkNode.length ? linkNode[0].nextSibling : null;
        if (nextNode && nextNode.type === "text") {
          link = (nextNode as unknown as { data: string }).data?.trim() || "";
        }
      }
      const pubDate = $(el).find("pubDate").text().trim();
      const sourceTag = $(el).find("source").text().trim();

      if (!title || title.length < 15) return;
      if (EXCLUDE_KEYWORDS.test(title)) return;
      // Google News is already filtered by query, but double-check relevance
      if (!HIGH_IMPACT_KEYWORDS.test(title)) return;
      if (items.some((h) => h.headline === title)) return;

      items.push({
        id: "",
        source: "reuters",  // Keep source as "reuters" for UI compatibility
        headline: title,
        summary: sourceTag ? `Fonte: ${sourceTag}` : null,
        author: null,
        url: link || null,
        impact: "high",
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        fetched_at: new Date().toISOString(),
        external_id: link ? hashString(link) : hashString(title),
      });
    });

    console.log(`[reuters] Got ${items.length} headlines via Google News`);
    return items.length > 0 ? items.slice(0, 15) : null;
  } catch (err) {
    console.error("[reuters] Error:", err);
    return null;
  }
}

async function fetchRSSHeadlines(
  feedUrls: readonly string[],
  source: string
): Promise<MacroHeadline[] | null> {
  try {
    console.log(`[rss-headlines] Fetching ${source}...`);

    const res = await fetchWithFallback(feedUrls, source, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    });

    if (!res) {
      console.warn(`[rss-headlines] ${source}: all URLs failed`);
      return null;
    }

    const xml = await res.text();

    if (!xml || xml.length < 100) {
      console.warn(`[rss-headlines] ${source}: empty or tiny response (${xml.length} bytes)`);
      return null;
    }

    const cheerio = await import("cheerio");
    const $ = cheerio.load(xml, { xml: true });

    const items: MacroHeadline[] = [];

    $("item").each((_, el) => {
      const title = stripHtml($(el).find("title").text().trim());

      // Extract link — handle both <link>URL</link> and <link/>URL text node patterns
      let link = $(el).find("link").text().trim();
      if (!link) {
        const linkNode = $(el).find("link");
        const nextNode = linkNode.length ? linkNode[0].nextSibling : null;
        if (nextNode && nextNode.type === "text") {
          link = (nextNode as unknown as { data: string }).data?.trim() || "";
        }
      }

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
