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
  const s = (symbol ?? "").toString().replace(/\s/g, "").toUpperCase();
  if (!s) return "other";
  if (FOREX.has(s)) return "forex";
  if (COMMODITIES.has(s)) return "commodities";
  if (INDICES.has(s)) return "indices";
  if (CRYPTO.has(s)) return "crypto";
  return "other";
}
