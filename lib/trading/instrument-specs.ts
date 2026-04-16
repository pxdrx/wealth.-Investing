/**
 * Instrument specifications used to compute per-trade risk (USD) from
 * (entry, stop-loss, volume). These contract sizes are approximations
 * good enough for the dashboard's "RR médio" metric — they don't need
 * broker-exact tick values.
 *
 * All functions are pure and defensive: any invalid input returns null.
 */

export type InstrumentCategory =
  | "forex"
  | "metals"
  | "indices"
  | "crypto"
  | "commodities";

const COMMODITIES = ["USOIL", "UKOIL", "NATGAS"];
const METALS = ["XAUUSD", "XAGUSD"];
const INDICES = ["NAS100", "US30", "US500", "SPX500", "DAX", "FTSE", "NIKKEI"];
const CRYPTO = ["BTCUSD", "ETHUSD", "BTCUSDT", "ETHUSDT"];

function normalize(symbol: string): string {
  return (symbol ?? "").toString().trim().toUpperCase();
}

/**
 * Categorize a trading symbol into one of the known instrument buckets.
 * Falls back to "forex" for any unrecognized ticker — this matches the
 * existing behavior in components/dashboard/BacktestSection.tsx.
 */
export function detectCategory(symbol: string): InstrumentCategory {
  const sym = normalize(symbol);
  if (METALS.some((m) => sym.includes(m))) return "metals";
  if (COMMODITIES.some((c) => sym.includes(c))) return "commodities";
  if (INDICES.some((i) => sym.includes(i))) return "indices";
  if (CRYPTO.some((c) => sym.includes(c))) return "crypto";
  return "forex";
}

export interface CalcRiskParams {
  symbol: string;
  entry: number;
  sl: number;
  volume: number;
}

/**
 * Compute the USD risk of a trade given entry, stop-loss and volume (lots).
 * Returns null if any input is invalid — callers must skip these trades
 * when averaging realized R/R.
 *
 * Contract sizes per category:
 *   forex (USD quote, e.g. EURUSD): |Δ| × 100_000 × volume
 *   forex (USD base, e.g. USDJPY):  |Δ| × 100_000 × volume / entry   (pip in USD)
 *   forex JPY cross (e.g. EURJPY):  |Δ| × 100_000 × volume / entry   (approx)
 *   metals (XAU/XAG):               |Δ| × 100 × volume
 *   indices (US30, NAS100, ...):    |Δ| × volume               (≈ $1/pt/lot)
 *   crypto (BTC*, ETH*):            |Δ| × volume
 *   commodities (USOIL, ...):       |Δ| × 1000 × volume
 */
export function calcRiskUsd(params: CalcRiskParams): number | null {
  const { symbol, entry, sl, volume } = params;

  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(sl) ||
    !Number.isFinite(volume) ||
    entry <= 0 ||
    sl <= 0 ||
    volume <= 0
  ) {
    return null;
  }

  const sym = normalize(symbol);
  if (!sym) return null;

  const category = detectCategory(sym);
  const delta = Math.abs(entry - sl);

  switch (category) {
    case "forex": {
      // JPY quote (XXXJPY) or USD base (USDXXX) — quote currency is not USD,
      // so we approximate the USD pip-value by dividing by entry price.
      const isJpyQuote = sym.endsWith("JPY");
      const isUsdBase = sym.startsWith("USD");
      if (isJpyQuote || isUsdBase) {
        return (delta * 100_000 * volume) / entry;
      }
      // USD as quote currency (EURUSD, GBPUSD, AUDUSD, ...).
      return delta * 100_000 * volume;
    }
    case "metals":
      return delta * 100 * volume;
    case "indices":
      return delta * volume;
    case "crypto":
      return delta * volume;
    case "commodities":
      return delta * 1_000 * volume;
    default:
      return null;
  }
}
