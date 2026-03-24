// lib/macro/constants.ts

export const CENTRAL_BANKS = [
  { code: "FED",     name: "Federal Reserve",           country: "US", currency: "USD" },
  { code: "ECB",     name: "European Central Bank",     country: "EU", currency: "EUR" },
  { code: "BOE",     name: "Bank of England",           country: "GB", currency: "GBP" },
  { code: "BOJ",     name: "Bank of Japan",             country: "JP", currency: "JPY" },
  { code: "BCB",     name: "Banco Central do Brasil",   country: "BR", currency: "BRL" },
  { code: "BOC",     name: "Bank of Canada",            country: "CA", currency: "CAD" },
  { code: "RBA",     name: "Reserve Bank of Australia", country: "AU", currency: "AUD" },
  { code: "PBOC",    name: "People's Bank of China",    country: "CN", currency: "CNY" },
  { code: "SNB",     name: "Swiss National Bank",       country: "CH", currency: "CHF" },
  { code: "BANXICO", name: "Banco de México",           country: "MX", currency: "MXN" },
] as const;

export const TRACKED_MARKETS = {
  forex: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "NZD/USD", "USD/BRL", "USD/CAD", "USD/CHF"],
  indices: ["S&P 500", "Nasdaq", "DJI"],
  commodities: ["XAUUSD", "XAGUSD", "USOIL"],
  crypto: ["BTC/USD", "ETH/USD"],
} as const;

export const FAIRECONOMY_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
export const FAIRECONOMY_NEXT_WEEK_URL = "https://nfs.faireconomy.media/ff_calendar_nextweek.json";

export const IMPACT_COLORS = {
  high: { bg: "bg-red-500/10", text: "text-red-500", dot: "bg-red-500" },
  medium: { bg: "bg-orange-500/10", text: "text-orange-500", dot: "bg-orange-500" },
  low: { bg: "bg-yellow-500/10", text: "text-yellow-500", dot: "bg-yellow-500" },
} as const;

export const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", EU: "🇪🇺", GB: "🇬🇧", JP: "🇯🇵", BR: "🇧🇷",
  CA: "🇨🇦", AU: "🇦🇺", NZ: "🇳🇿", CH: "🇨🇭", MX: "🇲🇽",
  CN: "🇨🇳", DE: "🇩🇪", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸",
};

/** Format date as YYYY-MM-DD using LOCAL timezone (avoids UTC shift from toISOString) */
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Get Monday of the week containing a given date */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return formatLocalDate(d);
}

/** Get Friday of the week containing a given date */
export function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -2 : 5); // Friday
  d.setDate(diff);
  return formatLocalDate(d);
}

/** Get Monday of the week offset by N weeks from a given date */
export function getWeekStartOffset(weeks: number, date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return getWeekStart(d);
}

export const CRON_SECRET_HEADER = "x-cron-secret";
