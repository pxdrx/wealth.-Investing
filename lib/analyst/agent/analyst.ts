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
  const hasQuote = data.quote && Object.keys(data.quote).length > 0 && !data.quote["Error Message"] && !data.quote["Note"];
  const hasTechnicals = Object.values(data.technicals).some((v) => v !== null);
  const hasFundamentals = data.fundamentals && Object.keys(data.fundamentals).length > 0;
  const hasCrypto = data.cryptoData && Object.keys(data.cryptoData).length > 0 && !data.cryptoData["error"];
  const hasNews = data.news && data.news.length > 0;

  if (!hasQuote && !hasTechnicals && !hasFundamentals && !hasCrypto && !hasNews) {
    throw new Error(`Ticker "${ticker}" não encontrado. Verifique o símbolo e tente novamente. Exemplos: EURUSD, AAPL, BTC, XAUUSD`);
  }

  onEvent?.({ type: "status", data: "Dados coletados. Gerando analise..." });

  // Step 2: Build analysis prompt
  const dataContext = JSON.stringify(data, null, 2).slice(0, 30000);

  const prompt = `Analise o ativo ${ticker} (tipo: ${assetType}).

## Dados coletados:
\`\`\`json
${dataContext}
\`\`\`

## Instrucoes:
Gere um relatorio de analise completo em JSON com esta estrutura EXATA:

{
  "sections": {
    "macro": { "title": "Contexto Macro", "content": "...", "bias": "bullish|bearish|neutral", "confidence": "alta|media|baixa" },
    "technical": { "title": "Analise Tecnica", "content": "...", "bias": "...", "confidence": "..." },
    "fundamental": { "title": "Analise Fundamental", "content": "...", "bias": "...", "confidence": "..." },
    "sentiment": { "title": "Sentimento", "content": "...", "bias": "...", "confidence": "..." },
    "risk": { "title": "Gestao de Risco", "content": "...", "bias": "...", "confidence": "..." }
  },
  "verdict": {
    "bias": "bullish|bearish|neutral",
    "confidence": "alta|media|baixa",
    "summary": "Resumo do veredicto em 2-3 frases",
    "keyLevels": ["Suporte: 1.0800", "Resistencia: 1.1000"],
    "tradeIdea": "Descricao da ideia de trade com entry, SL e TP"
  }
}

Regras:
- content de cada secao: 3-5 paragrafos detalhados
- Use dados reais dos dados coletados, nunca invente numeros
- Se dados insuficientes para uma secao, explique o que falta e de a melhor analise possivel
- Responda em PT-BR
- Se for forex/commodity, foque em macro + tecnico. Se stock, foque em fundamental + tecnico. Se crypto, foque em sentimento + tecnico.
- Retorne APENAS o JSON, sem markdown fencing`;

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

  let parsed: {
    sections: Record<string, AnalysisSection>;
    verdict: AnalysisReport["verdict"];
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Failed to parse analysis response");
    }
  }

  onEvent?.({ type: "status", data: "Analise completa!" });

  return {
    ticker: ticker.toUpperCase(),
    assetType,
    generatedAt: new Date().toISOString(),
    sections: {
      macro: parsed.sections.macro,
      technical: parsed.sections.technical,
      fundamental: parsed.sections.fundamental,
      sentiment: parsed.sections.sentiment,
      risk: parsed.sections.risk,
    },
    verdict: parsed.verdict,
  };
}
