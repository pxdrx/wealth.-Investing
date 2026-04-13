import type { MacroHeadline } from "../types";
import { fetchWithTimeout, hashString, stripHtml } from "./utils";

// RSS Feed URLs — primary + fallback for each source
const FEEDS = {
  forexlive: [
    "https://www.forexlive.com/feed",
    "https://www.forexlive.com/feed/",
  ],
  // Google News RSS — expanded queries for high-impact market-moving news
  // Split into EN + PT-BR feeds for better recall
  googlenews_en: [
    "https://news.google.com/rss/search?q=" +
      encodeURIComponent(
        [
          // Macro indicators
          "CPI", "NFP", "GDP", "inflation", "unemployment", "PMI", "retail sales",
          // Central banks
          "Fed", "ECB", "FOMC", "interest rate", "rate hike", "rate cut",
          // Geopolitics
          "war", "invasion", "sanctions", "tariff", "embargo", "blockade",
          "Iran", "Hormuz", "NATO", "missile", "ceasefire",
          // Markets & commodities
          "treasury", "gold", "crude oil", "bitcoin",
          // Politics
          "trump", "White House",
          // Crises
          "recession", "default", "debt ceiling", "pandemic",
        ].join(" OR ") + " when:1d"
      ) +
      "&hl=en",
  ],
  googlenews_ptbr: [
    "https://news.google.com/rss/search?q=" +
      encodeURIComponent(
        [
          // Macro
          "inflação", "PIB", "Selic", "desemprego", "juros",
          // Bancos centrais
          "banco central", "Copom", "Fed",
          // Geopolítica
          "guerra", "sanções", "tarifas", "embargo", "invasão", "conflito",
          // Mercados
          "dólar", "ouro", "petróleo", "bitcoin", "Ibovespa",
          // Política
          "Trump", "Casa Branca",
          // Crises
          "recessão", "crise", "calote",
        ].join(" OR ") + " when:1d"
      ) +
      "&hl=pt-BR",
  ],
} as const;

// Keywords that indicate market-moving content — EN + PT-BR
const HIGH_IMPACT_KEYWORDS =
  /\b(rate|rates|CPI|NFP|GDP|PIB|FOMC|Fed|ECB|BCE|BoJ|BoE|RBA|SNB|BoC|RBNZ|PBOC|Copom|Selic|tariff|tariffs|tarifas|trade war|guerra comercial|trade deal|oil|crude|WTI|Brent|petróleo|gold|ouro|silver|prata|copper|cobre|bitcoin|BTC|ETH|crypto|inflation|inflação|deflation|deflação|employment|jobs|unemployment|desemprego|payroll|PMI|ISM|retail sales|vendas.no.varejo|housing|PPI|PCE|treasury|treasuries|yield|yields|bond|bonds|dollar|dólar|DXY|euro|EUR|yen|JPY|pound|GBP|franc|CHF|AUD|NZD|CAD|central bank|banco central|monetary policy|política monetária|recession|recessão|stimulus|estímulo|sanctions|sanções|war|guerra|invasion|invasão|attack|ataque|conflict|conflito|missile|míssil|ceasefire|cessar-fogo|troops|tropas|military|militar|blockade|bloqueio|embargo|coup|golpe|geopolitical|geopolítica|stock|stocks|market|markets|economy|economic|economia|bank|banking|policy|trade|export|import|China|Russia|Rússia|Ukraine|Ucrânia|Iran|Irã|Taiwan|Israel|OPEC|NATO|OTAN|Nasdaq|S&P|Dow|Ibovespa|equities|rally|crash|surge|plunge|cut|hike|dovish|hawkish|risk|volatility|volatilidade|VIX|forex|FX|currency|câmbio|commodit|Hormuz|pandemic|pandemia|lockdown|default|calote|debt.ceiling|teto.da.dívida|nuclear|earnings|lucros|IPO|merger|fusão|bankruptcy|falência|black.swan|crisis|crise|hurricane|furacão|cyberattack|ciberataque)\b/i;

// Keywords to EXCLUDE (noise + non-macro content)
const EXCLUDE_KEYWORDS =
  /\b(sponsored|advertisement|partner content|webinar|course|academy|broker review|sign up|subscribe now|open account|demo account|trading platform review|sport|football|soccer|baseball|basketball|tennis|NFL|NBA|MLB|NHL|FIFA|championship|tournament|athlete|coach|player transfer|celebrity|entertainment|movie|film|TV show|series|actor|actress|singer|concert|album|Grammy|Oscar|Emmy|art|museum|statue|sculpture|gallery|exhibition|painting|fashion|shoe|sneaker|designer|runway|clothing|apparel|robot|humanoid|space launch|SpaceX launch|Mars|moon landing|recipe|cooking|restaurant|chef|food truck)\b/i;

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

export async function fetchReutersHeadlines(): Promise<MacroHeadline[] | null> {
  // Reuters blocks server-side requests (returns 401).
  // Use Google News RSS (EN + PT-BR) filtered for financial keywords.
  try {
    console.log("[reuters] Fetching via Google News RSS (EN + PT-BR)...");

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml",
    };

    // Fetch both EN and PT-BR feeds in parallel
    const [resEn, resPtBr] = await Promise.all([
      fetchWithFallback(FEEDS.googlenews_en, "google-news-en", headers),
      fetchWithFallback(FEEDS.googlenews_ptbr, "google-news-ptbr", headers),
    ]);

    const items: MacroHeadline[] = [];
    const seenTitles = new Set<string>();

    for (const res of [resEn, resPtBr]) {
      if (!res) continue;
      const xml = await res.text();
      const cheerio = await import("cheerio");
      const $ = cheerio.load(xml, { xml: true });

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
        if (EXCLUDE_KEYWORDS.test(title)) return;
        if (!HIGH_IMPACT_KEYWORDS.test(title)) return;
        const titleLower = title.toLowerCase();
        if (seenTitles.has(titleLower)) return;
        seenTitles.add(titleLower);

        items.push({
          id: "",
          source: "reuters",
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
    }

    console.log(`[reuters] Got ${items.length} headlines via Google News (EN+PT-BR)`);
    return items.length > 0 ? items.slice(0, 25) : null;
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
