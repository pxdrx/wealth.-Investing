import { fetchWithTimeout } from "@/lib/macro/scrapers/utils";

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
if (!API_KEY) {
  console.error("[alpha-vantage] ALPHA_VANTAGE_API_KEY not set — all requests will return null. Configure it in .env.local");
}
const BASE = "https://www.alphavantage.co/query";

/**
 * Get stock/forex/crypto quote and key metrics.
 */
export async function getQuote(
  symbol: string,
  type: "stock" | "forex" | "crypto"
): Promise<Record<string, unknown> | null> {
  try {
    let fn = "GLOBAL_QUOTE";
    let params = `symbol=${symbol}`;

    if (type === "forex") {
      fn = "CURRENCY_EXCHANGE_RATE";
      const from = symbol.slice(0, 3);
      const to = symbol.slice(3, 6);
      params = `from_currency=${from}&to_currency=${to}`;
    } else if (type === "crypto") {
      fn = "CURRENCY_EXCHANGE_RATE";
      const sym = symbol.replace(/USD[T]?$/, "");
      params = `from_currency=${sym}&to_currency=USD`;
    }

    const res = await fetchWithTimeout(
      `${BASE}?function=${fn}&${params}&apikey=${API_KEY}`,
      15_000
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Get technical indicators (RSI, MACD, SMA, EMA).
 */
export async function getTechnicalIndicator(
  symbol: string,
  indicator: "RSI" | "MACD" | "SMA" | "EMA",
  interval: string = "daily",
  timePeriod: number = 14
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(
      `${BASE}?function=${indicator}&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${API_KEY}`,
      15_000
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Get company overview (fundamentals for stocks).
 */
export async function getCompanyOverview(
  symbol: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(
      `${BASE}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`,
      15_000
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
