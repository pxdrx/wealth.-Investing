/**
 * Whitelist-based headline filter for financial relevance.
 * A headline passes if it contains at least one term (case-insensitive).
 */

const FINANCIAL_TERMS = [
  // ── Central banks & monetary policy ──
  "federal reserve", "fed", "fomc", "fed minutes", "fed funds rate",
  "ecb", "bce", "banco central europeu",
  "bank of england", "boe", "bank of japan", "boj",
  "rba", "reserve bank of australia", "snb", "swiss national bank",
  "boc", "bank of canada", "rbnz", "pboc", "banco central da china",
  "banco central", "banco central do brasil", "taxa selic", "copom",
  "interest rate", "taxa de juros", "base rate",
  "rate hike", "rate cut", "corte de juros", "alta de juros",
  "monetary policy", "política monetária",
  "quantitative easing", "quantitative tightening", "qe", "qt",
  "hawkish", "dovish", "aperto monetário", "afrouxamento monetário",
  "meeting minutes", "ata do copom",

  // ── Macroeconomic indicators ──
  "inflation", "inflação", "deflation", "deflação",
  "cpi", "consumer price", "índice de preços",
  "pce", "core pce", "ppi", "producer price",
  "gdp", "pib", "gross domestic product", "produto interno bruto",
  "nfp", "non-farm payroll", "nonfarm payroll", "payroll",
  "unemployment", "desemprego", "unemployment rate", "taxa de desemprego",
  "jobs report", "relatório de emprego", "employment change",
  "pmi", "ism", "purchasing managers",
  "retail sales", "vendas no varejo", "consumer spending", "consumo",
  "industrial production", "produção industrial",
  "housing", "housing starts", "building permits",
  "mortgage", "hipoteca", "imóveis",
  "trade balance", "balança comercial", "current account", "conta corrente",
  "durable goods", "bens duráveis",
  "recession", "recessão", "economic growth", "crescimento econômico",
  "stagflation", "estagflação",

  // ── Fixed income & yields ──
  "yield", "treasury", "treasuries", "bond", "bonds", "títulos",
  "yield curve", "curva de juros", "inverted yield", "bond yield",
  "credit rating", "rating de crédito", "downgrade", "upgrade",
  "spread", "risk premium", "prêmio de risco",

  // ── Indices ──
  "s&p", "s&p 500", "nasdaq", "dow jones", "dji",
  "ftse", "dax", "nikkei", "hang seng", "shanghai",
  "ibovespa", "bovespa", "russell", "stoxx",

  // ── Commodities ──
  "crude oil", "petróleo", "wti", "brent", "oil price", "preço do petróleo",
  "gold", "ouro", "xauusd", "silver", "prata", "xagusd",
  "copper", "cobre", "iron ore", "minério de ferro",
  "natural gas", "gás natural", "commodities", "commodity",

  // ── Forex ──
  "eur/usd", "eurusd", "gbp/usd", "gbpusd", "usd/jpy", "usdjpy",
  "aud/usd", "nzd/usd", "usd/cad", "usd/chf", "usd/brl",
  "dollar", "dólar", "dxy", "dollar index", "índice do dólar",
  "euro", "pound", "libra", "yen", "iene", "forex", "fx", "câmbio",
  "currency", "moeda", "desvalorização", "valorização",

  // ── Corporate & earnings ──
  "earnings", "lucros", "earnings report", "resultado trimestral",
  "revenue", "receita", "resultado", "balanço", "guidance",
  "ipo", "merger", "acquisition", "fusão", "aquisição",
  "bankruptcy", "falência", "default", "calote",
  "fraud", "fraude", "sec investigation", "investigação",
  "dividend", "dividendo", "share buyback", "recompra de ações",
  "revenue warning", "profit warning", "alerta de lucro",
  "regulator", "regulador", "fine", "multa",

  // ── Fiscal policy ──
  "debt ceiling", "teto da dívida", "fiscal", "orçamento", "budget",
  "deficit", "surplus", "superávit", "fiscal cliff",
  "government shutdown", "paralisação do governo",
  "stimulus", "estímulo", "spending bill", "pacote fiscal",

  // ── Geopolitics & security ──
  "war", "guerra", "invasion", "invasão", "attack", "ataque",
  "conflict", "conflito", "missile", "míssil", "missile strike",
  "troops", "tropas", "military", "militar", "pentagon", "pentágono",
  "defense", "defesa", "ceasefire", "cessar-fogo",
  "sanctions", "sanções", "embargo", "blockade", "bloqueio",
  "tariffs", "tarifas", "trade war", "guerra comercial", "trade deal",
  "coup", "golpe", "regime change",
  "nato", "otan", "un resolution", "resolução da onu",
  "iran", "irã", "north korea", "coreia do norte",
  "ukraine", "ucrânia", "russia", "rússia",
  "china", "taiwan", "middle east", "oriente médio",
  "strait of hormuz", "estreito de hormuz", "hormuz",
  "opec", "opec+", "g7", "g20", "brics",
  "nuclear", "enrichment", "enriquecimento",

  // ── Politics ──
  "trump", "biden", "president", "presidente",
  "white house", "casa branca", "oval office",
  "press conference", "coletiva de imprensa",
  "national security", "segurança nacional",
  "impeachment", "election", "eleição",
  "executive order", "decreto", "legislation", "legislação",
  "brexit",

  // ── Crises & black swans ──
  "covid", "virus", "vírus", "pandemic", "pandemia", "lockdown",
  "hurricane", "furacão", "earthquake", "terremoto", "tsunami",
  "cyberattack", "ciberataque", "hack", "ransomware",
  "black swan", "cisne negro", "crisis", "crise",
  "energy crisis", "crise energética", "supply chain", "cadeia de suprimentos",
  "famine", "fome", "drought", "seca", "flood", "inundação",

  // ── Crypto ──
  "crypto", "bitcoin", "btc", "ethereum", "eth", "blockchain",
  "stablecoin", "defi", "crypto regulation", "regulação cripto",

  // ── Market structure ──
  "sec", "cvm", "regulação", "regulation",
  "hedge fund", "institutional", "institucional",
  "volatility", "volatilidade", "vix", "liquidity", "liquidez",
  "market crash", "circuit breaker", "short squeeze",
  "flash crash", "margin call", "capitulation", "capitulação",
  "risk-off", "risk-on", "safe haven", "ativo de refúgio",
  "sell-off", "rally", "bull market", "bear market",
  "correction", "correção",

  // ── Geopolítica extra ──
  "red sea", "mar vermelho", "suez", "panama canal", "canal do panamá",
  "shipping", "frete marítimo", "houthi", "hezbollah", "hamas",
  "israel", "gaza", "lebanon", "líbano", "syria", "síria",
  "oil embargo", "embargo de petróleo",
  "china economy", "us economy", "economia americana", "economia chinesa",
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
