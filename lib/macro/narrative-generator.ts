// lib/macro/narrative-generator.ts
import Anthropic from "@anthropic-ai/sdk";
import type { EconomicEvent, RegionalAnalysis, MarketImpact, DecisionIntelligence, Sentiment, MacroHeadline } from "./types";
import { TRACKED_MARKETS } from "./constants";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const SYSTEM_PROMPT = `Você é um analista macroeconômico veterano, com mais de 50 anos de experiência, ex-gestor de grandes bancos globais e conselheiro de banco central. Seu QI é superior a 160 e sua leitura de mercado é probabilística, fria e objetiva. Você fala com a plateia da Smart Money Lab, no tom direto, técnico e didático do Wagner Huhn.

Responda SEMPRE em PT-BR. Formato de resposta: JSON válido com a estrutura exata solicitada. Não inclua markdown code fences, apenas JSON puro.

## Princípios
- Nada de opinião. Nada de torcida. Somente narrativa macro + fluxo + probabilidade.
- Use analogias simples (freio, acelerador, termômetro, corda esticada, mola comprimida) para explicar conceitos complexos.
- Probabilidade ≠ previsão. A soma das probabilidades de cada ativo deve dar 100%.
- Quem opera sem contexto está reagindo. Quem lê macro está se posicionando.`;

interface NarrativeInput {
  events: EconomicEvent[];
  teBriefing: string | null;
  teHeadlines?: string[] | null;
  weekAheadEditorial?: string | null;
  liveHeadlines?: MacroHeadline[] | null;
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
  const mediumCount = input.events.filter((e) => e.impact === "medium").length;
  const keyMarkets = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "DXY", "S&P 500", "Nasdaq", "Bitcoin"];

  // Only send high-impact events (not all 79) to fit in 60s timeout
  const userPrompt = `Análise semanal Smart Money Lab: ${input.weekStart} a ${input.weekEnd}.

EVENTOS DE ALTO IMPACTO (${highEvents.length} high, ${mediumCount} medium):
${highEvents.slice(0, 25).map((e) => `- ${e.date} ${e.time || ""} | ${e.country} | ${e.title} | Prev: ${e.previous || "N/A"} | Fcst: ${e.forecast || "N/A"} | Act: ${e.actual || "—"}`).join("\n")}
${input.teBriefing ? `\nCONTEXTO:\n${input.teBriefing.slice(0, 500)}\n` : ""}${input.weekAheadEditorial ? `WEEK AHEAD:\n${input.weekAheadEditorial.slice(0, 500)}\n` : ""}${input.liveHeadlines && input.liveHeadlines.length > 0 ? `HEADLINES AO VIVO:
${input.liveHeadlines
  .filter(h => h.impact === "breaking" || h.impact === "high")
  .slice(0, 10)
  .map((h, i) => `${i + 1}. [${h.source === "truth_social" ? "TRUMP" : "FJ"}] ${h.headline.slice(0, 120)}`)
  .join("\n")}
` : ""}
Responda em JSON. Campo "narrative": texto de 600-900 palavras em PT-BR com 5 seções (use **título** e \\n\\n):
1. **Visão Geral** — ciclo macro, tom da semana (risk-on/off), analogia didática
2. **EUA** — dados de emprego, inflação, FED, tensão dados fortes vs cortes
3. **Europa + Ásia** — BCE, BOJ, China, impacto em EUR/GBP/JPY
4. **Trade** — risk-on/off por bloco, carry trade, proteção, cenários por ativo (DXY, EURUSD, GBPUSD, XAUUSD, Nasdaq, S&P500, BTC com Alta%/Lateral%/Baixa% somando 100%)
5. **Fechamento** — "Quem opera sem contexto está reagindo. Quem lê macro está se posicionando."

Demais campos:
- regional_analysis: americas/europe/asia_pacific com outlook e key_events (2-3 cada)
- market_impacts: ${keyMarkets.join(", ")} com direction/conviction(0-100)/rationale curto
- decision_intelligence: base_scenario(prob 50-70%) + alt_scenario + conviction_map para os 8 ativos
- sentiment: bullish_pct + neutral_pct + bearish_pct = 100

JSON exato:
{"narrative":"...","regional_analysis":{"americas":{"title":"Américas","summary":"...","key_events":["..."],"outlook":"neutral"},"europe":{"title":"Europa","summary":"...","key_events":["..."],"outlook":"neutral"},"asia_pacific":{"title":"Ásia-Pacífico","summary":"...","key_events":["..."],"outlook":"neutral"}},"market_impacts":[{"asset":"EUR/USD","direction":"neutral","conviction":50,"rationale":"..."}],"decision_intelligence":{"base_scenario":{"title":"...","probability":60,"description":"...","key_drivers":["..."]},"alt_scenario":{"title":"...","probability":40,"description":"...","key_drivers":["..."]},"conviction_map":[{"asset":"EUR/USD","direction":"neutral","conviction":50}]},"sentiment":{"bullish_pct":33,"neutral_pct":34,"bearish_pct":33}}`;

  const response = await getAnthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response (strip any markdown fencing)
  let jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // If JSON is truncated (stop_reason: max_tokens), try to salvage
  if (response.stop_reason === "end_turn") {
    const parsed: NarrativeOutput = JSON.parse(jsonStr);
    return parsed;
  }

  // Truncated response — attempt to close open JSON
  console.warn("[narrative-generator] Response may be truncated, attempting JSON repair");
  // Find last complete field by looking for last complete key-value
  const lastBrace = jsonStr.lastIndexOf("}");
  if (lastBrace > 0) {
    // Count open/close braces and brackets to close them
    let openBraces = 0, openBrackets = 0;
    for (const ch of jsonStr.slice(0, lastBrace + 1)) {
      if (ch === "{") openBraces++;
      if (ch === "}") openBraces--;
      if (ch === "[") openBrackets++;
      if (ch === "]") openBrackets--;
    }
    jsonStr = jsonStr.slice(0, lastBrace + 1);
    jsonStr += "]".repeat(Math.max(0, openBrackets));
    jsonStr += "}".repeat(Math.max(0, openBraces));
  }

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
  const response = await getAnthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
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

Com base no estilo Smart Money Lab, gere um JSON com:
{
  "alert_title": "Título curto da atualização (max 80 chars, tom direto e técnico)",
  "update_text": "Parágrafo de 3-5 frases no estilo Smart Money Lab: explique o impacto do resultado real vs esperado, use uma analogia simples se cabível, e traduza para ação prática do trader. Sem opinião, só probabilidade e fluxo. Encerre com implicação para os próximos dias."
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
