/**
 * Inferência de category para journal_trades.
 * Nunca retorna null — fallback é "other".
 */

const FOREX = new Set([
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD",
  "EURJPY", "GBPJPY", "EURGBP", "AUDJPY", "CADJPY", "CHFJPY", "NZDJPY",
  "AUDCAD", "AUDNZD", "CADCHF", "EURAUD", "EURCAD", "EURNZD", "GBPAUD",
  "GBPCAD", "GBPCHF", "GBPNZD", "NZDCAD", "NZDCHF",
]);
const COMMODITIES = new Set([
  "XAUUSD", "XAGUSD", "USOIL", "UKOIL", "BRENT", "WTI", "NATGAS",
  "GOLD", "SILVER", "COPPER",
]);
const INDICES = new Set([
  "US30", "NAS100", "SPX500", "GER40", "UK100", "JP225", "FR40", "EU50", "VIX",
  "USTEC", "US500", "DE40", "STOXX50",
]);
const CRYPTO = new Set([
  "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "BTCUSDT", "ETHUSDT",
]);
const FUTURES = new Set([
  // CME Micros
  "MNQ", "MES", "MYM", "M2K", "MGC", "MCL", "MBT", "MET",
  "M6A", "M6B", "M6E", "M6J", "MCHF", "MSF", "MJY", "MNG", "MHG", "MSI",
  // E-minis / standard futures
  "ES", "NQ", "YM", "RTY", "GC", "SI", "CL", "NG", "HG",
  "ZB", "ZN", "ZC", "ZS", "ZW", "ZL", "ZM", "ZO", "ZF", "ZT",
  "ETH",
  // CME currency futures
  "6A", "6B", "6E", "6J", "6C", "6S", "6M", "6N",
]);
const STOCKS = new Set([
  "AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "META", "GOOG", "GOOGL",
  "SPY", "QQQ", "IWM", "DIA", "NFLX", "AMD", "INTC", "BABA", "PYPL",
]);

/**
 * Retorna category para um símbolo. Nunca retorna null.
 * Valores: "forex" | "commodities" | "indices" | "crypto" | "futures" | "stocks" | "other"
 */
export function inferCategory(symbol: string): string {
  // NinjaTrader-style futures ship the contract month code after a space —
  // e.g., "MGC 06-26", "MNQ 09-26", "ES 12-26". Take the first whitespace
  // token so the root symbol reaches the FUTURES set. Without this, "MGC
  // 06-26" becomes "MGC06-26" after the space-strip below and falls through
  // to the "forex" default, corrupting futures trades.
  const firstToken = (symbol ?? "").toString().trim().split(/\s+/)[0] ?? "";
  const raw = firstToken.replace(/\s/g, "").toUpperCase();
  if (!raw) return "forex"; // safe default
  // Strip common MT5 suffixes: US30.cash → US30, XAUUSD.raw → XAUUSD, NAS100.mini → NAS100
  let s = raw.replace(/\.(CASH|RAW|MINI|STD|ECN|PRO|STP|M|I|C|Z|F|H|U|X|_SB|_CFD)$/i, "");
  // Strip trailing contract-month codes like "MGC06-26", "ES12-2026".
  s = s.replace(/\d{2}[-\/]\d{2,4}$/, "");
  if (FOREX.has(s)) return "forex";
  if (COMMODITIES.has(s)) return "commodities";
  if (INDICES.has(s)) return "indices";
  if (CRYPTO.has(s)) return "crypto";
  if (FUTURES.has(s)) return "futures";
  if (STOCKS.has(s)) return "stocks";
  // Try partial matching for common patterns
  if (/^(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD)/.test(s) && s.length >= 6) return "forex";
  if (/^(XAU|XAG|OIL|BRENT|WTI|GOLD|SILVER|COPPER|NATGAS)/.test(s)) return "commodities";
  if (/^(US30|NAS|SPX|SP500|US500|GER|UK100|JP225|DAX|DOW|STOXX|USTEC|DE40|FR40|EU50|VIX)/.test(s)) return "indices";
  if (/^(BTC|ETH|SOL|XRP|ADA|DOGE|BNB|DOT|LINK|AVAX)/.test(s)) return "crypto";
  if (/^M(NQ|ES|YM|2K|GC|CL|BT|ET|6[ABEJCSMN])$/.test(s)) return "futures";
  if (/^(ES|NQ|YM|RTY|GC|SI|CL|NG|HG|Z[BNCSWLMOFT])$/.test(s)) return "futures";
  return "forex"; // safe default - avoids constraint violations
}
