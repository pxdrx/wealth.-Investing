// lib/macro/scrapers/te-rates.ts
// Cheerio-based scraper for TradingEconomics interest rates page.
// Returns null on failure (never throws).

import { CENTRAL_BANKS } from "../constants";
import type { CentralBankRate } from "../types";

interface ScrapedRate {
  bank_code: string;
  bank_name: string;
  country: string;
  current_rate: number;
  previous_rate: number | null;
  last_change_bps: number | null;
  last_action: "hold" | "cut" | "hike" | null;
}

/**
 * Banks whose editorial summary we fetch from the TE country page.
 * Matches the `VISIBLE_BANKS` set the frontend renders.
 */
const SUMMARY_BANKS = new Set(["BCB", "BOC", "BOE", "BOJ", "ECB", "FED"]);

/**
 * TE interest-rate page slug per bank code. Keep in sync with the URLs
 * linked from tradingeconomics.com/country-list/interest-rate.
 */
const TE_RATE_PAGE_SLUG: Record<string, string> = {
  FED: "united-states/interest-rate",
  ECB: "euro-area/interest-rate",
  BOE: "united-kingdom/interest-rate",
  BOJ: "japan/interest-rate",
  BCB: "brazil/interest-rate",
  BOC: "canada/interest-rate",
};

/** Build the full TE URL for a bank's interest-rate page. */
function teRateUrl(bankCode: string): string | null {
  const slug = TE_RATE_PAGE_SLUG[bankCode];
  return slug ? `https://tradingeconomics.com/${slug}` : null;
}

/**
 * Fetch the first descriptive paragraph from a bank's TE interest-rate page.
 * Returns null on any failure — callers must NOT substitute invented text.
 */
async function scrapeBankSummary(
  bankCode: string
): Promise<{ summary: string; source_url: string } | null> {
  const url = teRateUrl(bankCode);
  if (!url) return null;

  try {
    const { fetchWithTimeout } = await import("./utils");
    const res = await fetchWithTimeout(url, 20_000, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[te-rates] summary ${bankCode} returned ${res.status}`);
      return null;
    }

    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    // TE renders its SPA shell server-side but puts the editorial copy inside
    // inline <h2 style="line-height:1.45em"> blocks (not <p>). We try h2 first,
    // then fall back to <p> selectors in case TE ever changes the template.
    const candidateSelectors = [
      "h2",
      "#description p",
      ".page-description p",
      ".col-md-8 p",
      "article p",
    ];

    for (const selector of candidateSelectors) {
      const nodes = $(selector);
      for (let i = 0; i < nodes.length; i++) {
        const raw = $(nodes[i]).text().trim().replace(/\s+/g, " ");
        if (raw.length >= 120 && raw.length <= 1500) {
          // Trim to ~400 chars without cutting mid-sentence when possible.
          const trimmed = raw.length > 400 ? raw.slice(0, 397).replace(/\s+\S*$/, "") + "…" : raw;
          return { summary: trimmed, source_url: url };
        }
      }
    }

    console.warn(`[te-rates] summary ${bankCode}: no suitable paragraph found`);
    return null;
  } catch (err) {
    console.warn(`[te-rates] summary ${bankCode} failed:`, err);
    return null;
  }
}

/** Map TE country names to our bank codes */
const COUNTRY_NAME_TO_BANK: Record<string, string> = {
  "united states": "FED",
  "euro area": "ECB",
  "united kingdom": "BOE",
  "japan": "BOJ",
  "brazil": "BCB",
  "canada": "BOC",
  "australia": "RBA",
  "china": "PBOC",
  "switzerland": "SNB",
  "mexico": "BANXICO",
};

/** Derive hike/cut/hold + bps delta from current and previous scraped rates. */
function deriveChange(
  current: number,
  previous: number | null
): { last_change_bps: number | null; last_action: "hold" | "cut" | "hike" | null } {
  if (previous === null || !Number.isFinite(previous)) {
    return { last_change_bps: null, last_action: null };
  }
  const bps = Math.round((current - previous) * 100);
  const action: "hold" | "cut" | "hike" = bps > 0 ? "hike" : bps < 0 ? "cut" : "hold";
  return { last_change_bps: bps, last_action: action };
}

/**
 * Scrape TradingEconomics country-list/interest-rate page via Cheerio.
 * Returns partial rate objects (current_rate + derived last_action/bps) or null on failure.
 */
export async function scrapeTradingEconomicsRates(): Promise<Omit<CentralBankRate, "id">[] | null> {
  try {
    console.log("[te-rates] Scraping TradingEconomics rates...");

    const { fetchWithTimeout } = await import("./utils");
    const res = await fetchWithTimeout(
      "https://tradingeconomics.com/country-list/interest-rate",
      30_000,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    if (!res.ok) {
      console.warn(`[te-rates] TE returned ${res.status}`);
      return null;
    }

    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    const scraped: ScrapedRate[] = [];

    // TE renders a table with country data rows.
    // Columns: Country | Last (current) | Previous | Reference | Unit
    $("table#calendar tbody tr, table.table tbody tr, #aspnetForm table tbody tr").each(
      (_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        const country = $(cells[0]).text().trim();
        const rateText = $(cells[1]).text().trim();
        const rate = parseFloat(rateText.replace(",", "."));

        if (!country || isNaN(rate) || rate > 100 || rate < -5) return;

        const bankCode = COUNTRY_NAME_TO_BANK[country.toLowerCase()];
        if (!bankCode) return; // Only track known central banks

        const cb = CENTRAL_BANKS.find((b) => b.code === bankCode);
        if (!cb) return;

        // Try to pull Previous (column index 2). Some TE layouts have it in col 2,
        // others shift the columns — guard with sane bounds.
        let previous: number | null = null;
        if (cells.length >= 3) {
          const prevText = $(cells[2]).text().trim();
          const prev = parseFloat(prevText.replace(",", "."));
          if (!isNaN(prev) && prev <= 100 && prev >= -5) {
            previous = Math.round(prev * 100) / 100;
          }
        }

        const change = deriveChange(Math.round(rate * 100) / 100, previous);

        scraped.push({
          bank_code: bankCode,
          bank_name: cb.name,
          country: cb.country,
          current_rate: Math.round(rate * 100) / 100,
          previous_rate: previous,
          last_change_bps: change.last_change_bps,
          last_action: change.last_action,
        });
      }
    );

    // Fallback: scan raw text for country names near numbers (no Previous available here).
    if (scraped.length === 0) {
      console.warn("[te-rates] Table selector found 0 rates, trying text fallback");
      const text = $("body").text();
      const lowerText = text.toLowerCase();

      for (const [countryName, bankCode] of Object.entries(COUNTRY_NAME_TO_BANK)) {
        const idx = lowerText.indexOf(countryName);
        if (idx === -1) continue;

        const vicinity = text.slice(idx, idx + 120);
        const rateMatch = vicinity.match(/(\d+[.,]\d+)/);
        if (!rateMatch) continue;

        const rate = parseFloat(rateMatch[1].replace(",", "."));
        if (isNaN(rate) || rate > 100 || rate < -5) continue;

        const cb = CENTRAL_BANKS.find((b) => b.code === bankCode);
        if (!cb) continue;

        scraped.push({
          bank_code: bankCode,
          bank_name: cb.name,
          country: cb.country,
          current_rate: Math.round(rate * 100) / 100,
          previous_rate: null,
          last_change_bps: null,
          last_action: null,
        });
      }
    }

    console.log(`[te-rates] Scraped ${scraped.length} rates`);
    if (scraped.length === 0) return null;

    // Fetch editorial summaries for the VISIBLE_BANKS only. Sequential with
    // a small delay — we don't want to hammer TE and trigger a block.
    const summaries = new Map<string, { summary: string; source_url: string }>();
    for (const s of scraped) {
      if (!SUMMARY_BANKS.has(s.bank_code)) continue;
      const result = await scrapeBankSummary(s.bank_code);
      if (result) summaries.set(s.bank_code, result);
      // Gentle throttle between requests.
      await new Promise((r) => setTimeout(r, 600));
    }
    console.log(`[te-rates] Fetched ${summaries.size}/${SUMMARY_BANKS.size} summaries`);

    // Translate all summaries to PT-BR in one batch via Claude Haiku. On any
    // failure we null out the summaries (UI hides the paragraph) rather than
    // displaying English in a Portuguese dashboard.
    if (summaries.size > 0) {
      const { translateBankSummaries } = await import("../translate");
      const entries = Array.from(summaries.entries());
      const texts = entries.map(([, v]) => v.summary);
      const translated = await translateBankSummaries(texts);
      if (translated) {
        entries.forEach(([code, v], i) => {
          summaries.set(code, { summary: translated[i], source_url: v.source_url });
        });
        console.log(`[te-rates] Translated ${translated.length} summaries to PT-BR`);
      } else {
        summaries.clear();
        console.warn("[te-rates] Translation failed — clearing summaries (no mixed-language output)");
      }
    }

    // Convert to full CentralBankRate shape (without id).
    // last_change_date deliberately left null — cron handler stamps detection moment.
    return scraped.map((s) => {
      const sum = summaries.get(s.bank_code) ?? null;
      return {
        bank_code: s.bank_code,
        bank_name: s.bank_name,
        country: s.country,
        current_rate: s.current_rate,
        last_action: s.last_action,
        last_change_bps: s.last_change_bps,
        last_change_date: null,
        next_meeting: null,
        updated_at: new Date().toISOString(),
        summary: sum?.summary ?? null,
        source_url: sum?.source_url ?? null,
      };
    });
  } catch (err) {
    console.error("[te-rates] Scrape error:", err);
    return null;
  }
}
