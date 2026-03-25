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

/**
 * Gather all available data for a ticker.
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

  const promises: Promise<void>[] = [];

  // Quote (all asset types)
  const quoteType =
    assetType === "crypto"
      ? "crypto"
      : assetType === "forex" || assetType === "commodity"
        ? "forex"
        : "stock";
  promises.push(
    getQuote(ticker, quoteType).then((d) => {
      results.quote = d;
    })
  );

  // Technical indicators (stocks, forex, commodities)
  if (assetType !== "crypto") {
    const avSymbol =
      assetType === "forex"
        ? `${ticker.slice(0, 3)}${ticker.slice(3)}`
        : ticker;
    promises.push(
      Promise.allSettled([
        getTechnicalIndicator(avSymbol, "RSI"),
        getTechnicalIndicator(avSymbol, "MACD"),
        getTechnicalIndicator(avSymbol, "SMA", "daily", 50),
        getTechnicalIndicator(avSymbol, "EMA", "daily", 20),
      ]).then(([rsi, macd, sma, ema]) => {
        results.technicals = {
          rsi: rsi.status === "fulfilled" ? rsi.value : null,
          macd: macd.status === "fulfilled" ? macd.value : null,
          sma50: sma.status === "fulfilled" ? sma.value : null,
          ema20: ema.status === "fulfilled" ? ema.value : null,
        };
      })
    );
  }

  // Fundamentals (stocks only)
  if (assetType === "stock") {
    promises.push(
      getCompanyOverview(ticker).then((d) => {
        results.fundamentals = d;
      })
    );
    promises.push(
      getBasicFinancials(ticker).then((d) => {
        if (d) results.fundamentals = { ...results.fundamentals, ...d };
      })
    );
    promises.push(
      getRecommendations(ticker).then((d) => {
        results.recommendations = d;
      })
    );
  }

  // News (stocks)
  if (assetType === "stock") {
    promises.push(
      getNews(ticker).then((d) => {
        results.news = d;
      })
    );
  }

  // Crypto data
  if (assetType === "crypto") {
    promises.push(
      getCryptoData(ticker).then((d) => {
        results.cryptoData = d;
      })
    );
    promises.push(
      getCryptoChart(ticker, 30).then((d) => {
        if (d) results.technicals = { ...results.technicals, chart30d: d };
      })
    );
  }

  await Promise.allSettled(promises);
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
