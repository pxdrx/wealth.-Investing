/** Twelve Data — Stocks, Forex, Commodities, Indices */

const API_KEY = process.env.TWELVE_DATA_API_KEY;
const BASE = "https://api.twelvedata.com";

async function fetchTD(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown> | null> {
  if (!API_KEY) return null;
  try {
    const qs = new URLSearchParams({ ...params, apikey: API_KEY }).toString();
    const res = await fetch(`${BASE}${endpoint}?${qs}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface TwelveDataQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high52w: number;
  low52w: number;
}

export async function getQuote(symbol: string): Promise<TwelveDataQuote | null> {
  const data = await fetchTD("/quote", { symbol });
  if (!data || data.status === "error") return null;
  const ftw = data.fifty_two_week as Record<string, string> | undefined;
  return {
    symbol: data.symbol as string,
    price: Number(data.close) || 0,
    change: Number(data.change) || 0,
    changePercent: Number(data.percent_change) || 0,
    volume: Number(data.volume) || 0,
    high52w: ftw ? Number(ftw.high) || 0 : 0,
    low52w: ftw ? Number(ftw.low) || 0 : 0,
  };
}

export interface StockStats {
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  profitMargin: number | null;
}

export async function getStockStatistics(symbol: string): Promise<StockStats | null> {
  const data = await fetchTD("/statistics", { symbol });
  if (!data || data.status === "error") return null;
  const stats = data.statistics as Record<string, Record<string, unknown>> | undefined;
  if (!stats) return null;
  const val = stats.valuations_metrics as Record<string, unknown> | undefined;
  const stk = stats.stock_statistics as Record<string, unknown> | undefined;
  return {
    marketCap: val ? Number(val.market_capitalization) || null : null,
    pe: val ? Number(val.trailing_pe) || null : null,
    eps: val ? Number(val.diluted_eps_ttm) || null : null,
    beta: stk ? Number(stk.beta) || null : null,
    dividendYield: val ? Number(val.forward_annual_dividend_yield) || null : null,
    profitMargin: val ? Number(val.profit_margin) || null : null,
  };
}

export async function getTimeSeries(symbol: string, interval: string = "1day", outputSize: number = 50): Promise<{ datetime: string; close: number }[] | null> {
  const data = await fetchTD("/time_series", { symbol, interval, outputsize: String(outputSize) });
  if (!data || data.status === "error") return null;
  const values = data.values as Array<{ datetime: string; close: string }> | undefined;
  return values?.map((v) => ({ datetime: v.datetime, close: Number(v.close) })) ?? null;
}

export async function getSMA(symbol: string, period: number = 200): Promise<number | null> {
  const data = await fetchTD("/sma", { symbol, interval: "1day", time_period: String(period), outputsize: "1" });
  if (!data || data.status === "error") return null;
  const values = data.values as Array<{ sma: string }> | undefined;
  return values?.[0] ? Number(values[0].sma) : null;
}
