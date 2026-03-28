import { fetchWithTimeout } from "@/lib/macro/scrapers/utils";

const API_KEY = process.env.FINNHUB_API_KEY ?? "";
const BASE = "https://finnhub.io/api/v1";

const FINNHUB_CONFIGURED = API_KEY.length > 0;
if (!FINNHUB_CONFIGURED) {
  console.warn("[finnhub] FINNHUB_API_KEY is not configured — finnhub tools will return null.");
}

interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  datetime: number;
  sentiment?: number;
}

/**
 * Get company news/sentiment.
 */
export async function getNews(
  symbol: string,
  daysBack: number = 7
): Promise<NewsItem[] | null> {
  if (!FINNHUB_CONFIGURED) return null;
  try {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - daysBack * 86400000)
      .toISOString()
      .split("T")[0];

    const res = await fetchWithTimeout(
      `${BASE}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${API_KEY}`,
      15_000
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as NewsItem[]).slice(0, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Get basic financials (P/E, margins, etc.).
 */
export async function getBasicFinancials(
  symbol: string
): Promise<Record<string, unknown> | null> {
  if (!FINNHUB_CONFIGURED) return null;
  try {
    const res = await fetchWithTimeout(
      `${BASE}/stock/metric?symbol=${symbol}&metric=all&token=${API_KEY}`,
      15_000
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Get recommendation trends.
 */
export async function getRecommendations(
  symbol: string
): Promise<Array<Record<string, unknown>> | null> {
  if (!FINNHUB_CONFIGURED) return null;
  try {
    const res = await fetchWithTimeout(
      `${BASE}/stock/recommendation?symbol=${symbol}&token=${API_KEY}`,
      15_000
    );
    if (!res.ok) return null;
    return (await res.json()) as Array<Record<string, unknown>>;
  } catch {
    return null;
  }
}
