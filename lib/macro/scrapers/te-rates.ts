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

/**
 * Scrape TradingEconomics country-list/interest-rate page via Cheerio.
 * Returns partial rate objects (current_rate only) or null on failure.
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
    // Each row: country name | last (rate) | previous | range high | range low | date
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

        scraped.push({
          bank_code: bankCode,
          bank_name: cb.name,
          country: cb.country,
          current_rate: Math.round(rate * 100) / 100,
        });
      }
    );

    // Fallback: scan raw text for country names near numbers
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
        });
      }
    }

    console.log(`[te-rates] Scraped ${scraped.length} rates`);
    if (scraped.length === 0) return null;

    // Convert to full CentralBankRate shape (without id).
    // last_action, last_change_bps, etc. are null -- callers merge with DB.
    return scraped.map((s) => ({
      bank_code: s.bank_code,
      bank_name: s.bank_name,
      country: s.country,
      current_rate: s.current_rate,
      last_action: null,
      last_change_bps: null,
      last_change_date: null,
      next_meeting: null,
      updated_at: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("[te-rates] Scrape error:", err);
    return null;
  }
}
