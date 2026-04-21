// [C-10] Map trading symbols to ISO currency codes impacted by macro events.
// Used by `useMyAssets` + macro page to filter calendar/headlines/rates to
// currencies relevant to what the user actually trades.

const SYMBOL_PATTERNS: Array<[RegExp, string[]]> = [
  // Metals
  [/^XAU(USD)?$/i, ["USD"]],
  [/^XAG(USD)?$/i, ["USD"]],
  // Crypto
  [/^BTC(USD|USDT)?$/i, ["USD"]],
  [/^ETH(USD|USDT)?$/i, ["USD"]],
  [/^(SOL|BNB|XRP|ADA|DOGE|DOT|AVAX|MATIC|LTC)(USD|USDT)?$/i, ["USD"]],
  // Indices
  [/^(US30|DJ30|DJIA)$/i, ["USD"]],
  [/^(US100|NAS100|NDX)$/i, ["USD"]],
  [/^(US500|SPX500|SPX)$/i, ["USD"]],
  [/^(GER30|DE30|DAX40?|DE40)$/i, ["EUR"]],
  [/^(UK100|FTSE100?)$/i, ["GBP"]],
  [/^(JP225|N225|NIKKEI)$/i, ["JPY"]],
  [/^(HK50|HSI)$/i, ["HKD", "CNY"]],
  [/^(AU200|ASX200)$/i, ["AUD"]],
  // Oil / energy
  [/^(USOIL|WTI|XTI)$/i, ["USD"]],
  [/^(UKOIL|BRENT|XBR)$/i, ["USD", "GBP"]],
];

// Forex pairs: split into two 3-letter codes.
function extractForexCurrencies(symbol: string): string[] | null {
  const clean = symbol.replace(/[^A-Z]/gi, "").toUpperCase();
  if (clean.length < 6) return null;
  const base = clean.slice(0, 3);
  const quote = clean.slice(3, 6);
  const known = new Set(["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY", "HKD", "SGD", "SEK", "NOK", "MXN", "ZAR", "TRY", "BRL"]);
  if (known.has(base) && known.has(quote)) return [base, quote];
  return null;
}

/** Return ISO currency codes that macro events about `symbol` would move. */
export function currenciesForSymbol(symbol: string): string[] {
  if (!symbol) return [];
  const upper = symbol.toUpperCase();
  for (const [pattern, codes] of SYMBOL_PATTERNS) {
    if (pattern.test(upper)) return codes;
  }
  const fx = extractForexCurrencies(upper);
  if (fx) return fx;
  return [];
}

/** Deduped ISO codes covering every symbol the user trades. */
export function currenciesForSymbols(symbols: readonly string[]): string[] {
  const set = new Set<string>();
  for (const s of symbols) {
    for (const c of currenciesForSymbol(s)) set.add(c);
  }
  return Array.from(set);
}

// Rough currency → ISO2 country map for calendars that expose country but not
// currency. EUR is ambiguous — include the biggest Eurozone printers.
const CURRENCY_TO_COUNTRIES: Record<string, string[]> = {
  USD: ["US"],
  EUR: ["EU", "DE", "FR", "IT", "ES", "NL"],
  GBP: ["GB"],
  JPY: ["JP"],
  AUD: ["AU"],
  CAD: ["CA"],
  CHF: ["CH"],
  NZD: ["NZ"],
  CNY: ["CN"],
  HKD: ["HK"],
  BRL: ["BR"],
  MXN: ["MX"],
  ZAR: ["ZA"],
  TRY: ["TR"],
  SGD: ["SG"],
  SEK: ["SE"],
  NOK: ["NO"],
};

export function countriesForCurrencies(codes: readonly string[]): string[] {
  const set = new Set<string>();
  for (const c of codes) {
    for (const country of CURRENCY_TO_COUNTRIES[c] ?? []) set.add(country);
  }
  return Array.from(set);
}
