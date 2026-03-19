// lib/macro/narrative-generator.ts
import Anthropic from "@anthropic-ai/sdk";
import type { EconomicEvent, RegionalAnalysis, MarketImpact, DecisionIntelligence, Sentiment } from "./types";
import { TRACKED_MARKETS } from "./constants";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Você é um analista macroeconômico veterano com 50+ anos de experiência em mercados globais. Seu público são traders de forex/futuros no Brasil.

Responda SEMPRE em PT-BR. Seja direto, institucional, sem jargões desnecessários.

Formato de resposta: JSON válido com a estrutura exata solicitada. Não inclua markdown, apenas JSON puro.`;

interface NarrativeInput {
  events: EconomicEvent[];
  teBriefing: string | null;
  weekStart: string;
  weekEnd: string;
}

interface NarrativeOutput {
  narrative: string;
  regional_analysis: RegionalAnalysis;
  market_impacts: MarketImpact[];
  decision_intelligence: DecisionIntelligence;
  sentiment: Sentiment;
}

export async function generateWeeklyNarrative(input: NarrativeInput): Promise<NarrativeOutput> {
  const highEvents = input.events.filter((e) => e.impact === "high");
  const allMarkets = [
    ...TRACKED_MARKETS.forex,
    ...TRACKED_MARKETS.indices,
    ...TRACKED_MARKETS.commodities,
    ...TRACKED_MARKETS.crypto,
  ];

  const userPrompt = `Gere a análise semanal para ${input.weekStart} a ${input.weekEnd}.

EVENTOS DE ALTO IMPACTO DESTA SEMANA:
${highEvents.map((e) => `- ${e.date} ${e.time || "TBD"} | ${e.country} | ${e.title} | Prev: ${e.previous || "N/A"} | Forecast: ${e.forecast || "N/A"} | Actual: ${e.actual || "Pendente"}`).join("\n")}

TODOS OS EVENTOS (${input.events.length} total):
${input.events.map((e) => `- ${e.date} ${e.time || ""} | ${e.country} | ${e.title} [${e.impact}]`).join("\n")}

${input.teBriefing ? `CONTEXTO EDITORIAL (TradingEconomics):\n${input.teBriefing}\n` : ""}

MERCADOS COBERTOS: ${allMarkets.join(", ")}

Responda em JSON com esta estrutura exata:
{
  "narrative": "Texto de 3-5 parágrafos em PT-BR sobre a semana macro. Inclua os eventos mais impactantes, contexto histórico, e o que os traders devem observar.",
  "regional_analysis": {
    "americas": { "title": "Américas", "summary": "...", "key_events": ["evento1", "evento2"], "outlook": "bullish|neutral|bearish" },
    "europe": { "title": "Europa", "summary": "...", "key_events": ["evento1"], "outlook": "bullish|neutral|bearish" },
    "asia_pacific": { "title": "Ásia-Pacífico", "summary": "...", "key_events": ["evento1"], "outlook": "bullish|neutral|bearish" }
  },
  "market_impacts": [
    { "asset": "EUR/USD", "direction": "bullish|bearish|neutral", "conviction": 0-100, "rationale": "..." }
  ],
  "decision_intelligence": {
    "base_scenario": { "title": "...", "probability": 60, "description": "...", "key_drivers": ["driver1"] },
    "alt_scenario": { "title": "...", "probability": 40, "description": "...", "key_drivers": ["driver1"] },
    "conviction_map": [
      { "asset": "EUR/USD", "direction": "long|short|neutral", "conviction": 0-100 }
    ]
  },
  "sentiment": { "bullish_pct": 40, "neutral_pct": 35, "bearish_pct": 25 }
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response (strip any markdown fencing)
  const jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed: NarrativeOutput = JSON.parse(jsonStr);

  return parsed;
}

/**
 * Generate adaptive re-analysis when a HIGH impact event diverges from forecast.
 * Returns a short update narrative.
 */
export async function generateAdaptiveUpdate(
  event: EconomicEvent,
  existingNarrative: string
): Promise<{ update_text: string; alert_title: string }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `EVENTO ATUALIZADO COM RESULTADO:
- ${event.country} | ${event.title}
- Forecast: ${event.forecast || "N/A"}
- Actual: ${event.actual}
- Previous: ${event.previous || "N/A"}

NARRATIVA EXISTENTE DA SEMANA:
${existingNarrative.slice(0, 2000)}

Gere um JSON com:
{
  "alert_title": "Título curto da atualização (max 80 chars)",
  "update_text": "Parágrafo de 2-3 frases explicando o impacto do resultado real vs esperado e o que muda para os traders."
}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(jsonStr);
}
