// lib/macro/scrapers/te-breaking.ts
// Scrape the featured "News" card on tradingeconomics.com homepage.
// This is the top urgent/breaking item TE highlights — much faster
// than waiting for the public news API to surface it.

import type { MacroHeadline } from "../types";
import { fetchWithTimeout, hashString, stripHtml } from "./utils";

const HOMEPAGE_URL = "https://tradingeconomics.com";
const TIMEOUT_MS = 15_000;

/**
 * Fetch the TE homepage featured/breaking news card.
 * Returns null on failure (never throws).
 */
export async function fetchTradingEconomicsBreaking(): Promise<MacroHeadline[] | null> {
  try {
    const res = await fetchWithTimeout(HOMEPAGE_URL, TIMEOUT_MS, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[te-breaking] homepage returned ${res.status}`);
      return null;
    }

    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    const out: MacroHeadline[] = [];
    const seen = new Set<string>();

    // Strategy: TE homepage exposes a featured news block at the top
    // (selector varies over time). We look at a few likely containers
    // and pick the first headline link with a /news/ href.
    const candidateSelectors = [
      ".te-news-stream a[href*='/news/']",
      ".te-news a[href*='/news/']",
      ".breaking-news a[href*='/news/']",
      "section.news a[href*='/news/']",
      "a[href*='/news/']",
    ];

    for (const sel of candidateSelectors) {
      $(sel).each((_, el) => {
        const $el = $(el);
        const rawTitle = stripHtml($el.text()).trim();
        const href = ($el.attr("href") || "").trim();

        if (!rawTitle || rawTitle.length < 25 || rawTitle.length > 280) return;
        if (seen.has(rawTitle)) return;
        seen.add(rawTitle);

        const url = href.startsWith("http")
          ? href
          : `https://tradingeconomics.com${href}`;

        // The headline closest to the top is treated as the breaking
        // featured card. We only keep the first match.
        if (out.length === 0) {
          out.push({
            id: "",
            source: "te_breaking",
            headline: rawTitle,
            summary: null,
            author: null,
            url,
            impact: "breaking",
            published_at: new Date().toISOString(),
            fetched_at: new Date().toISOString(),
            external_id: hashString(`te_breaking:${rawTitle}:${url}`),
            tier: "breaking",
          });
        }
      });

      if (out.length > 0) break;
    }

    if (out.length === 0) {
      console.warn("[te-breaking] no featured headline found on homepage");
      return null;
    }

    console.log(`[te-breaking] captured featured headline: "${out[0].headline.slice(0, 80)}"`);
    return out;
  } catch (err) {
    console.error("[te-breaking] scrape error:", err);
    return null;
  }
}
