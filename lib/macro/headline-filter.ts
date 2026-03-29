/**
 * Whitelist-based headline filter for financial relevance.
 * A headline passes if it contains at least one term (case-insensitive).
 */

const FINANCIAL_TERMS = [
  // Central banks & monetary policy
  "federal reserve", "fed", "ecb", "bce", "bank of england", "boj", "fomc",
  "interest rate", "taxa de juros", "rate hike", "rate cut", "corte de juros", "alta de juros",
  // Inflation & economic indicators
  "inflation", "inflação", "cpi", "pce", "gdp", "pib", "nfp", "nonfarm payroll",
  "unemployment", "desemprego", "recession", "recessão", "pmi", "ism",
  "retail sales", "vendas no varejo", "housing", "imóveis", "mortgage", "hipoteca",
  // Fixed income
  "yield", "treasury", "bonds", "títulos",
  // Indices
  "s&p", "nasdaq", "dow jones", "ftse", "dax", "nikkei",
  // Commodities
  "crude oil", "petróleo", "wti", "brent", "gold", "ouro", "silver", "prata", "copper", "cobre",
  // Forex
  "eur/usd", "gbp/usd", "usd/jpy", "dollar", "dólar", "euro", "pound", "yen", "forex",
  // Corporate
  "earnings", "lucros", "revenue", "resultado", "balanço", "guidance", "ipo",
  "merger", "acquisition", "fusão", "aquisição", "bankruptcy", "falência", "default", "calote",
  // Fiscal & geopolitics
  "debt ceiling", "teto da dívida", "fiscal", "orçamento", "budget", "deficit", "surplus",
  "trade war", "guerra comercial", "tariffs", "tarifas", "sanctions", "sanções",
  "geopolitical", "geopolítica", "opec",
  // Macro
  "china economy", "us economy", "economia americana",
  // Crypto
  "crypto", "bitcoin", "ethereum", "blockchain",
  // Market structure
  "sec", "regulação", "regulation", "hedge fund", "institutional",
  "volatility", "volatilidade", "vix", "liquidity", "liquidez",
  "market crash", "circuit breaker", "short squeeze",
  // Common tickers
  "xauusd", "eurusd", "gbpusd", "usdjpy", "commodities",
];

const TERMS_LOWER = FINANCIAL_TERMS.map((t) => t.toLowerCase());

/** Returns true if the headline contains at least one financial term */
export function isFinanciallyRelevant(headline: string): boolean {
  const lower = headline.toLowerCase();
  return TERMS_LOWER.some((term) => lower.includes(term));
}

/** Filter an array of items with a headline field */
export function filterRelevantHeadlines<T extends { headline: string }>(items: T[]): T[] {
  return items.filter((item) => isFinanciallyRelevant(item.headline));
}
