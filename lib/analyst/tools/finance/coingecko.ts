import { fetchWithTimeout } from "@/lib/macro/scrapers/utils";

const BASE = "https://api.coingecko.com/api/v3";

// Map common tickers to CoinGecko IDs
const TICKER_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOT: "polkadot",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  NEAR: "near",
  APT: "aptos",
};

function tickerToId(ticker: string): string {
  const clean = ticker.toUpperCase().replace(/USD[T]?$/, "");
  return TICKER_MAP[clean] || clean.toLowerCase();
}

/**
 * Get comprehensive crypto data.
 */
export async function getCryptoData(
  ticker: string
): Promise<Record<string, unknown> | null> {
  try {
    const id = tickerToId(ticker);
    const res = await fetchWithTimeout(
      `${BASE}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`,
      15_000
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Get market chart data (prices, volumes, market caps).
 */
export async function getCryptoChart(
  ticker: string,
  days: number = 30
): Promise<Record<string, unknown> | null> {
  try {
    const id = tickerToId(ticker);
    const res = await fetchWithTimeout(
      `${BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
      15_000
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
