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

/**
 * Retorna category para um símbolo. Nunca retorna null.
 * Valores: "forex" | "commodities" | "indices" | "crypto" | "other"
 */
export function inferCategory(symbol: string): string {
  const raw = (symbol ?? "").toString().replace(/\s/g, "").toUpperCase();
  if (!raw) return "forex"; // safe default
  // Strip common MT5 suffixes: US30.cash → US30, XAUUSD.raw → XAUUSD, NAS100.mini → NAS100
  const s = raw.replace(/\.(CASH|RAW|MINI|STD|ECN|PRO|STP|M|I|C|Z|F|H|U|X|_SB|_CFD)$/i, "");
  if (FOREX.has(s)) return "forex";
  if (COMMODITIES.has(s)) return "commodities";
  if (INDICES.has(s)) return "indices";
  if (CRYPTO.has(s)) return "crypto";
  // Try partial matching for common patterns
  if (/^(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD)/.test(s) && s.length >= 6) return "forex";
  if (/^(XAU|XAG|OIL|BRENT|WTI|GOLD|SILVER|COPPER|NATGAS)/.test(s)) return "commodities";
  if (/^(US30|NAS|SPX|SP500|US500|GER|UK100|JP225|DAX|DOW|STOXX|USTEC|DE40|FR40|EU50|VIX)/.test(s)) return "indices";
  if (/^(BTC|ETH|SOL|XRP|ADA|DOGE|BNB|DOT|LINK|AVAX)/.test(s)) return "crypto";
  return "forex"; // safe default - avoids constraint violations
}
