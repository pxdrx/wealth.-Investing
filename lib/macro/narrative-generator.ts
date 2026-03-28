// lib/macro/narrative-generator.ts
import Anthropic from "@anthropic-ai/sdk";
import type { EconomicEvent, AssetImpacts, MacroHeadline } from "./types";


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
  weekly_bias: string;
  daily_update: string;
  asset_impacts: AssetImpacts;
}

export async function generateWeeklyNarrative(input: NarrativeInput): Promise<NarrativeOutput> {
  const highEvents = input.events.filter((e) => e.impact === "high");
  const mediumCount = input.events.filter((e) => e.impact === "medium").length;

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
Responda em JSON com a estrutura exata abaixo. Dois campos de texto + impacto por ativo.

Campo "weekly_bias": Viés semanal — análise estável do cenário macro da semana em 2-3 parágrafos (PT-BR, 200-400 palavras). Cubra: tom macro (risk-on/off), política monetária, expectativas do mercado, geopolítica, e principais catalisadores da semana. Esta análise é gerada uma vez por semana e deve ser robusta.

Campo "daily_update": Atualização diária — o que mudou nas últimas horas com base nas headlines ao vivo em 2-3 parágrafos (PT-BR, 150-300 palavras). Cubra: impactos imediatos das notícias recentes, movimentos de mercado intraday, alertas para o trader. Se não houver headlines recentes, escreva um parágrafo indicando que o cenário segue conforme o viés semanal.

Campo "asset_impacts": análise de impacto para 4 categorias de ativos. Para cada uma:
- bias: "bullish", "bearish" ou "neutral"
- confidence: "alta", "media" ou "baixa"
- reason: 1-2 frases explicando o viés (PT-BR)
- key_levels: níveis técnicos relevantes (ex: "S&P 5800-5900", "XAU/USD 2300-2350")

JSON exato:
{"weekly_bias":"...","daily_update":"...","asset_impacts":{"indices":{"bias":"bullish","confidence":"alta","reason":"...","key_levels":"S&P 5800-5900"},"gold":{"bias":"bearish","confidence":"media","reason":"...","key_levels":"XAU/USD 2300-2350"},"btc":{"bias":"neutral","confidence":"baixa","reason":"...","key_levels":"BTC 65k-70k"},"dollar":{"bias":"bullish","confidence":"alta","reason":"...","key_levels":"DXY 104-106"}}}`;

  const response = await getAnthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response (strip any markdown fencing)
  let jsonStr = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // FIX TECH-010: Wrap all JSON.parse calls in try/catch with fallback.
  // LLM responses may not always be valid JSON.
  const fallbackOutput: NarrativeOutput = {
    weekly_bias: "Análise indisponível no momento. Tente novamente.",
    daily_update: "Atualização indisponível no momento.",
    asset_impacts: {
      indices: { bias: "neutral", confidence: "baixa", reason: "Dados insuficientes", key_levels: "N/A" },
      gold: { bias: "neutral", confidence: "baixa", reason: "Dados insuficientes", key_levels: "N/A" },
      btc: { bias: "neutral", confidence: "baixa", reason: "Dados insuficientes", key_levels: "N/A" },
      dollar: { bias: "neutral", confidence: "baixa", reason: "Dados insuficientes", key_levels: "N/A" },
    },
  };

  // If JSON is truncated (stop_reason: max_tokens), try to salvage
  if (response.stop_reason === "end_turn") {
    try {
      const parsed: NarrativeOutput = JSON.parse(jsonStr);
      return parsed;
    } catch (e) {
      console.error("[narrative-generator] Failed to parse LLM JSON (end_turn):", e);
      return fallbackOutput;
    }
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

  try {
    const parsed: NarrativeOutput = JSON.parse(jsonStr);
    return parsed;
  } catch (e) {
    console.error("[narrative-generator] Failed to parse repaired LLM JSON:", e);
    return fallbackOutput;
  }
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
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[narrative-generator] Failed to parse adaptive update JSON:", e);
    return {
      alert_title: "Atualização indisponível",
      update_text: "Não foi possível processar a análise do evento. Tente novamente.",
    };
  }
}
