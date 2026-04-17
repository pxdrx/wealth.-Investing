// lib/macro/scrapers/financial-juice.ts
//
// FinancialJuice is a curated real-time squawk feed for day traders.
// Every item on their feed is already financial (no noise filtering needed),
// and their UI flags "Market Moving" items in red — which is exactly what the
// user needs to see up top.
//
// Their RSS (https://www.financialjuice.com/feed.ashx) does NOT expose the
// "Market Moving" category tag, so we promote a subset of items to the
// "breaking" tier using a tight keyword classifier that mirrors what FJ's
// editorial red-flags (geopolitical shocks, rate decisions, central-bank
// speeches with actionable content, hot CPI/NFP/PPI prints, crashes/plunges).

import type { MacroHeadline } from "../types";
import { fetchWithTimeout, hashString, stripHtml } from "./utils";

const FJ_FEED_URL = "https://www.financialjuice.com/feed.ashx";
const FJ_TITLE_PREFIX_RE = /^FinancialJuice:\s*/i;

/**
 * Title patterns that FJ typically red-flags as Market Moving.
 * Keep this list TIGHT — false positives spam the breaking tier in the UI.
 */
const MARKET_MOVING_RE = new RegExp(
  [
    // Geopolitics — active conflict, blockades, ceasefires
    "\\bceasefire\\b",
    "\\bstrike(s)?\\b",
    "\\bblockade\\b",
    "\\bembargo\\b",
    "\\binvasion\\b",
    "\\bmissile(s)?\\b",
    "\\battack(ed)?\\b",
    "\\bhormuz\\b",
    "\\bhouthi\\b",
    "\\bnuclear\\b",
    // Central bank decisions + prepared speeches
    "\\b(rate|rates)\\s+(hike|cut|hold|decision)\\b",
    "\\bhike(s)? rates\\b",
    "\\bcut(s)? rates\\b",
    "\\bemergency (meeting|rate|cut|hike)\\b",
    "\\bpress conference\\b",
    // Key macro prints (actual vs forecast surprise language)
    "\\b(cpi|ppi|nfp|payroll|unemployment|gdp|pmi) (rose|rises|fell|falls|surges|plunges|jumps|drops|misses|beats|above|below|higher|lower)\\b",
    "\\bhotter[- ]than[- ]expected\\b",
    "\\bcooler[- ]than[- ]expected\\b",
    "\\bbeats forecast\\b",
    "\\bmisses forecast\\b",
    // Price-move verbs that FJ uses to mark moves
    "\\b(plunge|plunges|surges|crashes|tumbles|skyrockets|spikes)\\b",
    "\\bbreaks (above|below)\\b",
    "\\bhits (record|fresh|new) (high|low)\\b",
    // Political shocks with trading impact
    "\\btariff(s)?\\b",
    "\\btrade war\\b",
    "\\bsanction(s)?\\b",
    "\\bshutdown\\b",
    "\\bdefault(s)?\\b",
    // Explicit breaking/urgent markers
    "\\bbreaking\\b",
    "\\burgent\\b",
    "\\balert\\b",
    "\\bflash\\b",
  ].join("|"),
  "i",
);

function cleanTitle(raw: string): string {
  const stripped = stripHtml(raw).trim();
  return stripped.replace(FJ_TITLE_PREFIX_RE, "").trim();
}

function classifyTier(title: string): "breaking" | "high" {
  return MARKET_MOVING_RE.test(title) ? "breaking" : "high";
}

export async function fetchFinancialJuiceHeadlines(): Promise<MacroHeadline[] | null> {
  try {
    const res = await fetchWithTimeout(FJ_FEED_URL, 15_000, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!res.ok) {
      console.warn(`[financial-juice] HTTP ${res.status} from feed`);
      return null;
    }

    const xml = await res.text();
    if (!xml || xml.length < 100) {
      console.warn(`[financial-juice] empty/tiny response (${xml.length} bytes)`);
      return null;
    }

    const cheerio = await import("cheerio");
    const $ = cheerio.load(xml, { xml: true });

    const items: MacroHeadline[] = [];
    const seen = new Set<string>();

    $("item").each((_, el) => {
      const rawTitle = $(el).find("title").text();
      const title = cleanTitle(rawTitle);
      if (!title || title.length < 8) return;

      const link = $(el).find("link").text().trim();
      const pubDate = $(el).find("pubDate").text().trim();
      const guid = $(el).find("guid").text().trim();

      const dedupKey = guid || link || title.toLowerCase();
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      const tier = classifyTier(title);

      items.push({
        id: "",
        source: "financial_juice",
        headline: title,
        summary: null,
        author: null,
        url: link || null,
        // Use the classified tier for both impact and tier columns so the
        // cross-source sorter in headline-filter treats Market Moving items
        // as top-of-feed alongside TE Breaking.
        impact: tier,
        tier,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
        fetched_at: new Date().toISOString(),
        external_id: guid ? hashString(`fj:${guid}`) : hashString(`fj:${title}`),
      });
    });

    console.log(
      `[financial-juice] parsed ${items.length} items (${items.filter((i) => i.tier === "breaking").length} market-moving)`,
    );
    return items.length > 0 ? items : null;
  } catch (err) {
    console.error("[financial-juice] fetch/parse error:", err);
    return null;
  }
}
