import Anthropic from "@anthropic-ai/sdk";
import {
  AnalysisReport,
  AnalysisSection,
  AssetType,
  detectAssetType,
} from "../types";
import {
  getQuote,
  getTechnicalIndicator,
  getCompanyOverview,
} from "../tools/finance/alpha-vantage";
import {
  getNews,
  getBasicFinancials,
  getRecommendations,
} from "../tools/finance/finnhub";
import { getCryptoData, getCryptoChart } from "../tools/finance/coingecko";
import * as fs from "fs";
import * as path from "path";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

function loadSoul(): string {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), "lib/analyst/SOUL.md"),
      "utf-8"
    );
  } catch {
    return "Voce e um analista financeiro especializado. Responda em PT-BR.";
  }
}

interface GatherResult {
  quote: Record<string, unknown> | null;
  technicals: Record<string, unknown>;
  fundamentals: Record<string, unknown> | null;
  news: Array<{ headline: string; summary: string }> | null;
  recommendations: Array<Record<string, unknown>> | null;
  cryptoData: Record<string, unknown> | null;
}

/** Delay helper for rate limiting */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gather all available data for a ticker.
 * Alpha Vantage: 1 req/sec rate limit — calls are serialized with delay.
 * Finnhub: 60 req/min — used as primary source for stocks (no rate issue).
 */
async function gatherData(
  ticker: string,
  assetType: AssetType
): Promise<GatherResult> {
  const results: GatherResult = {
    quote: null,
    technicals: {},
    fundamentals: null,
    news: null,
    recommendations: null,
    cryptoData: null,
  };

  // --- Finnhub calls (parallel, no rate issue) ---
  const finnhubPromises: Promise<void>[] = [];

  if (assetType === "stock") {
    finnhubPromises.push(
      getBasicFinancials(ticker).then((d) => {
        results.fundamentals = d;
      })
    );
    finnhubPromises.push(
      getRecommendations(ticker).then((d) => {
        results.recommendations = d;
      })
    );
    finnhubPromises.push(
      getNews(ticker).then((d) => {
        results.news = d;
      })
    );
  }

  // For indices, try fetching general market news via Finnhub
  if (assetType === "index") {
    finnhubPromises.push(
      getNews(ticker).then((d) => {
        results.news = d;
      }).catch(() => { /* Non-critical for indices */ })
    );
  }

  // --- CoinGecko calls (parallel, no rate issue) ---
  if (assetType === "crypto") {
    finnhubPromises.push(
      getCryptoData(ticker).then((d) => {
        results.cryptoData = d;
      })
    );
    finnhubPromises.push(
      getCryptoChart(ticker, 30).then((d) => {
        if (d) results.technicals = { ...results.technicals, chart30d: d };
      })
    );
  }

  // --- Alpha Vantage calls (serialized, 1 req/sec) ---
  const avPromise = (async () => {
    // Indices (DXY, SPX, etc.) are not well supported by Alpha Vantage —
    // skip technicals entirely and rely on Claude's knowledge + Finnhub data.
    if (assetType === "index") {
      // Try quote as stock ticker (some indices have proxy ETFs)
      try {
        results.quote = await getQuote(ticker, "stock");
      } catch {
        // Non-critical — Claude can still analyze without quote data
        results.quote = null;
      }
      return;
    }

    const quoteType =
      assetType === "crypto"
        ? "crypto"
        : assetType === "forex" || assetType === "commodity"
          ? "forex"
          : "stock";

    // 1. Quote
    results.quote = await getQuote(ticker, quoteType);
    await delay(1200);

    // 2. Company overview (stocks only)
    if (assetType === "stock") {
      const overview = await getCompanyOverview(ticker);
      if (overview && !overview["Note"] && !overview["Information"]) {
        results.fundamentals = { ...results.fundamentals, ...overview };
      }
      await delay(1200);
    }

    // 3-6. Technical indicators (stocks, forex, commodities)
    if (assetType !== "crypto") {
      const avSymbol =
        assetType === "forex"
          ? `${ticker.slice(0, 3)}${ticker.slice(3)}`
          : ticker;

      const rsi = await getTechnicalIndicator(avSymbol, "RSI");
      results.technicals = { ...results.technicals, rsi: rsi && !rsi["Note"] ? rsi : null };
      await delay(1200);

      const macd = await getTechnicalIndicator(avSymbol, "MACD");
      results.technicals = { ...results.technicals, macd: macd && !macd["Note"] ? macd : null };
      await delay(1200);

      const sma = await getTechnicalIndicator(avSymbol, "SMA", "daily", 50);
      results.technicals = { ...results.technicals, sma50: sma && !sma["Note"] ? sma : null };
      await delay(1200);

      const ema = await getTechnicalIndicator(avSymbol, "EMA", "daily", 20);
      results.technicals = { ...results.technicals, ema20: ema && !ema["Note"] ? ema : null };
    }
  })();

  // Run Finnhub/CoinGecko in parallel with Alpha Vantage (serialized)
  await Promise.allSettled([...finnhubPromises, avPromise]);
  return results;
}

/**
 * Generate a complete analysis report using Claude.
 */
export async function generateAnalysis(
  ticker: string,
  onEvent?: (event: { type: string; data: string }) => void
): Promise<AnalysisReport> {
  const assetType = detectAssetType(ticker);
  const soul = loadSoul();

  // Step 1: Gather data
  onEvent?.({
    type: "status",
    data: `Coletando dados para ${ticker} (${assetType})...`,
  });
  const data = await gatherData(ticker, assetType);

  // Validate: if no data returned from any source, ticker is likely invalid
  // Indices (DXY, SPX, etc.) are always valid — Claude has built-in knowledge
  const hasQuote = data.quote && Object.keys(data.quote).length > 0 && !data.quote["Error Message"] && !data.quote["Note"];
  const hasTechnicals = Object.values(data.technicals).some((v) => v !== null);
  const hasFundamentals = data.fundamentals && Object.keys(data.fundamentals).length > 0;
  const hasCrypto = data.cryptoData && Object.keys(data.cryptoData).length > 0 && !data.cryptoData["error"];
  const hasNews = data.news && data.news.length > 0;
  const isKnownIndex = assetType === "index";

  if (!isKnownIndex && !hasQuote && !hasTechnicals && !hasFundamentals && !hasCrypto && !hasNews) {
    throw new Error(`Ticker "${ticker}" não encontrado. Verifique o símbolo e tente novamente. Exemplos: EURUSD, AAPL, BTC, XAUUSD`);
  }

  onEvent?.({ type: "status", data: "Dados coletados. Gerando analise..." });

  // Step 2: Build analysis prompt
  const dataContext = JSON.stringify(data, null, 2).slice(0, 30000);

  const prompt = `Analise o ativo ${ticker} (tipo: ${assetType}).

## Dados coletados de fontes reais:
\`\`\`json
${dataContext}
\`\`\`

## INSTRUCOES CRITICAS:
1. USE APENAS os dados fornecidos acima para numeros e metricas. Nao invente precos, volumes ou indicadores.
2. Se os dados mostram tendencia de queda, o bias DEVE ser bearish. Nunca seja otimista contra os dados.
3. Considere o contexto geopolitico ATUAL (marco 2026): guerras, sancoes, ciclo de juros, decisoes de bancos centrais.
4. Probabilidades de Bear+Base+Bull DEVEM somar exatamente 100%.
5. O score de 1-10 deve ser coerente com o verdict e os cenarios.

## Responda em JSON com esta estrutura EXATA:
{
  "category": "classificacao do ativo (ex: Digital gold (Cryptocurrency), Major Pair (Forex), Tech Stock (Equity))",
  "description": "3-4 frases explicando o que e o ativo para qualquer pessoa",
  "metrics": {
    "Price": "valor atual do ativo",
    "Market Cap": "se disponivel",
    "Volume 24h": "se disponivel",
    "Category": "mesma categoria",
    ... outros campos relevantes ao tipo de ativo
  },
  "analysis": "3-5 paragrafos DENSOS de analise. Cite dados especificos: precos, percentuais, datas, indicadores. Cubra: contexto macro/geopolitico, dados tecnicos (RSI, MACD, medias), fundamentos, sentimento, fluxo institucional. NAO seja generico.",
  "scenarios": {
    "bear": { "probability": 40, "description": "Descricao detalhada do cenario negativo com triggers e contexto", "target": "$XX,XXX-$XX,XXX" },
    "base": { "probability": 35, "description": "Cenario base com condicoes de manutencao", "target": "$XX,XXX-$XX,XXX" },
    "bull": { "probability": 25, "description": "Cenario positivo com triggers necessarios", "target": "$XX,XXX-$XX,XXX" }
  },
  "score": {
    "value": 6,
    "reasoning": "Uma frase explicando o score baseado nos dados"
  },
  "verdict": {
    "type": "INVESTMENT|TRADING|HEDGE|AVOID",
    "bias": "bullish|bearish|neutral",
    "confidence": "alta|media|baixa",
    "text": "2-3 frases de recomendacao final acionavel"
  },
  "sections": {
    "macro": { "title": "Contexto Macro", "content": "3-5 paragrafos", "bias": "bullish|bearish|neutral", "confidence": "alta|media|baixa" },
    "technical": { "title": "Analise Tecnica", "content": "3-5 paragrafos", "bias": "...", "confidence": "..." },
    "fundamental": { "title": "Analise Fundamental", "content": "3-5 paragrafos", "bias": "...", "confidence": "..." },
    "sentiment": { "title": "Sentimento", "content": "3-5 paragrafos", "bias": "...", "confidence": "..." },
    "risk": { "title": "Gestao de Risco", "content": "3-5 paragrafos", "bias": "...", "confidence": "..." }
  }
}

Regras finais:
- Responda em PT-BR
- Retorne APENAS o JSON, sem markdown fencing
- Se dados insuficientes para uma metrica, use "N/A"
- analysis deve ser um unico string com paragrafos separados por \\n\\n`;

  // Step 3: Call Claude
  const response = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: soul,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Step 4: Parse JSON
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Failed to parse analysis response");
    }
  }

  onEvent?.({ type: "status", data: "Analise completa!" });

  const sections = (parsed.sections as Record<string, AnalysisSection>) ?? {};
  const verdict = (parsed.verdict as Record<string, unknown>) ?? {};
  const scenarios = (parsed.scenarios as Record<string, Record<string, unknown>>) ?? {};
  const score = (parsed.score as Record<string, unknown>) ?? {};

  return {
    ticker: ticker.toUpperCase(),
    assetType,
    category: (parsed.category as string) ?? assetType,
    generatedAt: new Date().toISOString(),
    description: (parsed.description as string) ?? "",
    metrics: (parsed.metrics as Record<string, string>) ?? {},
    analysis: (parsed.analysis as string) ?? "",
    scenarios: {
      bear: { probability: (scenarios.bear?.probability as number) ?? 33, description: (scenarios.bear?.description as string) ?? "", target: (scenarios.bear?.target as string) ?? undefined },
      base: { probability: (scenarios.base?.probability as number) ?? 34, description: (scenarios.base?.description as string) ?? "", target: (scenarios.base?.target as string) ?? undefined },
      bull: { probability: (scenarios.bull?.probability as number) ?? 33, description: (scenarios.bull?.description as string) ?? "", target: (scenarios.bull?.target as string) ?? undefined },
    },
    score: {
      value: (score.value as number) ?? 5,
      reasoning: (score.reasoning as string) ?? "",
    },
    verdict: {
      type: ((verdict.type as string) ?? "TRADING") as "INVESTMENT" | "TRADING" | "HEDGE" | "AVOID",
      bias: ((verdict.bias as string) ?? "neutral") as "bullish" | "bearish" | "neutral",
      confidence: ((verdict.confidence as string) ?? "media") as "alta" | "media" | "baixa",
      text: (verdict.text as string) ?? (verdict.summary as string) ?? "",
      summary: (verdict.summary as string) ?? (verdict.text as string) ?? "",
      keyLevels: (verdict.keyLevels as string[]) ?? [],
      tradeIdea: (verdict.tradeIdea as string) ?? "",
    },
    sections: {
      macro: sections.macro ?? { title: "Contexto Macro", content: "", bias: "neutral", confidence: "baixa" },
      technical: sections.technical ?? { title: "Analise Tecnica", content: "", bias: "neutral", confidence: "baixa" },
      fundamental: sections.fundamental ?? { title: "Analise Fundamental", content: "", bias: "neutral", confidence: "baixa" },
      sentiment: sections.sentiment ?? { title: "Sentimento", content: "", bias: "neutral", confidence: "baixa" },
      risk: sections.risk ?? { title: "Gestao de Risco", content: "", bias: "neutral", confidence: "baixa" },
    },
  };
}
