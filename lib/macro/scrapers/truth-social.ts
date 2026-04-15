import type { MacroHeadline } from "../types";
import { fetchWithTimeout, stripHtml, hashString } from "./utils";
import { isNoise } from "../headline-filter";

const TRUMP_ACCOUNT_ID = "107780257626128497";
const API_BASE = "https://truthsocial.com/api/v1";

interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  url: string;
  reblog: MastodonStatus | null;
}

/**
 * Keywords to identify Trump-specific market-moving content from Google News.
 */
/**
 * Keywords usadas para filtrar o fallback do Google News.
 * Foco estrito em termos de mercado — sem "White House"/"press conference"/"military" genéricos
 * (eles deixam passar UFC, cerimônias, eventos sociais).
 */
const TRUMP_KEYWORDS =
  /\b(tariff|tariffs|trade war|trade deal|sanctions|embargo|executive order|ceasefire|cessar-fogo|Iran|Ukraine|Russia|China trade|North Korea|Federal Reserve|Fed rate|oil|crude|OPEC|Israel|Hamas|Hezbollah|nuclear|dollar|treasury|recession|inflation)\b/i;

/**
 * Fetch Trump's Truth Social posts via public Mastodon API.
 * Falls back to Google News RSS for Trump-related headlines if API is blocked.
 * Returns null on failure (never throws).
 */
export async function fetchTruthSocialPosts(): Promise<MacroHeadline[] | null> {
  // Try direct API first
  const directResult = await fetchFromMastodonApi();
  if (directResult && directResult.length > 0) return directResult;

  // Fallback: Google News RSS for Trump statements
  console.log("[truth-social] Direct API failed, falling back to Google News RSS...");
  return fetchTrumpFromGoogleNews();
}

async function fetchFromMastodonApi(): Promise<MacroHeadline[] | null> {
  try {
    console.log("[truth-social] Trying direct Mastodon API...");

    const res = await fetchWithTimeout(
      `${API_BASE}/accounts/${TRUMP_ACCOUNT_ID}/statuses?limit=20&exclude_replies=true&exclude_reblogs=true`,
      15_000,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    if (!res.ok) {
      console.warn(`[truth-social] API returned ${res.status}`);
      return null;
    }

    const posts: MastodonStatus[] = await res.json();
    if (!posts || posts.length === 0) {
      console.warn("[truth-social] No posts returned");
      return null;
    }

    console.log(`[truth-social] Got ${posts.length} posts from API`);

    return posts
      .filter((p) => p.content && !p.reblog)
      .map((post) => {
        const text = stripHtml(post.content).trim();
        const headline = text.length > 280 ? text.slice(0, 277) + "..." : text;

        return {
          id: "",
          source: "truth_social" as const,
          headline,
          summary: text.length > 280 ? text : null,
          author: "@realDonaldTrump",
          url: post.url || `https://truthsocial.com/@realDonaldTrump/posts/${post.id}`,
          impact: "high" as const,
          published_at: post.created_at || null,
          fetched_at: new Date().toISOString(),
          external_id: post.id,
        };
      })
      .filter((h) => h.headline.length > 0 && !isNoise(h.headline));
  } catch (err) {
    console.error("[truth-social] API error:", err);
    return null;
  }
}

/**
 * Fallback: fetch Trump-related headlines from Google News RSS.
 * These are news articles about Trump's statements, tariffs, executive orders, etc.
 */
async function fetchTrumpFromGoogleNews(): Promise<MacroHeadline[] | null> {
  try {
    const query = encodeURIComponent(
      '("Trump tariff" OR "Trump tariffs" OR "Trump sanctions" OR "Trump trade deal" OR "Trump trade war" OR "Trump Iran" OR "Trump Russia" OR "Trump Ukraine" OR "Trump China trade" OR "Trump Federal Reserve" OR "Trump oil" OR "Trump ceasefire" OR "executive order economy" OR "White House economic" OR "Trump OPEC" OR "Trump Israel")'
    );
    const url = `https://news.google.com/rss/search?q=${query}+when:1d&hl=en`;

    const res = await fetchWithTimeout(url, 15_000, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, text/xml, */*",
      },
    });

    if (!res.ok) {
      console.warn(`[truth-social] Google News RSS returned ${res.status}`);
      return null;
    }

    const xml = await res.text();
    if (!xml || xml.length < 100) return null;

    const cheerio = await import("cheerio");
    const $ = cheerio.load(xml, { xml: true });

    const items: MacroHeadline[] = [];

    $("item").each((_, el) => {
      const title = stripHtml($(el).find("title").text().trim());
      let link = $(el).find("link").text().trim();
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
      // Only include Trump-specific headlines
      if (!TRUMP_KEYWORDS.test(title)) return;
      // Drop noise (UFC, ceremonies, celebrities, family, etc)
      if (isNoise(title)) return;
      if (items.some((h) => h.headline === title)) return;

      items.push({
        id: "",
        source: "truth_social" as const,
        headline: title,
        summary: sourceTag ? `Fonte: ${sourceTag}` : null,
        author: null,
        url: link || null,
        impact: "high" as const,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        fetched_at: new Date().toISOString(),
        external_id: link ? hashString(link) : hashString(title),
      });
    });

    console.log(`[truth-social] Got ${items.length} Trump headlines via Google News`);
    return items.length > 0 ? items.slice(0, 15) : null;
  } catch (err) {
    console.error("[truth-social] Google News fallback error:", err);
    return null;
  }
}
