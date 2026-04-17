// lib/macro/narrative-generator.ts
import Anthropic from "@anthropic-ai/sdk";
import type {
  EconomicEvent,
  AssetImpacts,
  MacroHeadline,
  DailyAdjustmentEvent,
  DailyAdjustmentAssetUpdate,
} from "./types";

const WEEKLY_MODEL = "claude-sonnet-4-6";
const DAILY_ADJUSTMENT_MODEL = "claude-sonnet-4-6";
const ADAPTIVE_UPDATE_MODEL = "claude-haiku-4-5-20251001";

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
  /** Events from the PREVIOUS week (with actuals filled) for recap. */
  previousWeekEvents?: EconomicEvent[];
  weekStart: string;
  weekEnd: string;
}

interface NarrativeOutput {
  weekly_bias: string;
  daily_update: string;
  asset_impacts: AssetImpacts;
}

const FALLBACK_NARRATIVE: NarrativeOutput = {
  weekly_bias: "Análise indisponível no momento. Tente novamente.",
  daily_update: "Atualização indisponível no momento.",
  asset_impacts: {
    indices: { bias: "neutral", confidence: "baixa", reason: "Dados insuficientes", key_levels: "N/A" },
    gold: { bias: "neutral", confidence: "baixa", reason: "Dados insuficientes", key_levels: "N/A" },
    btc: { bias: "neutral", confidence: "baixa", reason: "Dados insuficientes", key_levels: "N/A" },
    dollar: { bias: "neutral", confidence: "baixa", reason: "Dados insuficientes", key_levels: "N/A" },
  },
};

function formatEventLine(e: EconomicEvent): string {
  return `- ${e.date} ${e.time || ""} | ${e.country} | ${e.title} | Prev: ${e.previous || "N/A"} | Fcst: ${e.forecast || "N/A"} | Act: ${e.actual || "—"}`;
}

function repairTruncatedJson(jsonStr: string): string {
  const lastBrace = jsonStr.lastIndexOf("}");
  if (lastBrace <= 0) return jsonStr;
  let openBraces = 0;
  let openBrackets = 0;
  for (const ch of jsonStr.slice(0, lastBrace + 1)) {
    if (ch === "{") openBraces++;
    if (ch === "}") openBraces--;
    if (ch === "[") openBrackets++;
    if (ch === "]") openBrackets--;
  }
  let repaired = jsonStr.slice(0, lastBrace + 1);
  repaired += "]".repeat(Math.max(0, openBrackets));
  repaired += "}".repeat(Math.max(0, openBraces));
  return repaired;
}

export async function generateWeeklyNarrative(input: NarrativeInput): Promise<NarrativeOutput> {
  const highEvents = input.events.filter((e) => e.impact === "high");
  const mediumCount = input.events.filter((e) => e.impact === "medium").length;
  const prevHighEvents = (input.previousWeekEvents || []).filter(
    (e) => e.impact === "high" && e.actual && e.actual.trim().length > 0
  );

  const recapBlock = prevHighEvents.length > 0
    ? `SEMANA PASSADA — RED LINES QUE SAÍRAM (${prevHighEvents.length}):
${prevHighEvents.slice(0, 15).map(formatEventLine).join("\n")}
`
    : "SEMANA PASSADA: sem dados de red lines disponíveis.\n";

  const upcomingBlock = `PRÓXIMA/ATUAL SEMANA — AGENDA HIGH IMPACT (${highEvents.length} high, ${mediumCount} medium):
${highEvents.slice(0, 25).map(formatEventLine).join("\n")}
`;

  const userPrompt = `Briefing macro Smart Money Lab — semana ${input.weekStart} a ${input.weekEnd}.

${recapBlock}
${upcomingBlock}
${input.teBriefing ? `CONTEXTO TE:\n${input.teBriefing.slice(0, 500)}\n` : ""}${input.weekAheadEditorial ? `WEEK AHEAD:\n${input.weekAheadEditorial.slice(0, 500)}\n` : ""}${input.liveHeadlines && input.liveHeadlines.length > 0 ? `HEADLINES AO VIVO (últimas 48h):
${input.liveHeadlines
  .filter((h) => h.impact === "breaking" || h.impact === "high")
  .slice(0, 10)
  .map((h, i) => `${i + 1}. [${h.source === "truth_social" ? "TRUMP" : h.source.toUpperCase()}] ${h.headline.slice(0, 120)}`)
  .join("\n")}
` : ""}
Responda em JSON com a estrutura exata abaixo.

Campo "weekly_bias" (200-400 palavras, 3 parágrafos, PT-BR):
  §1 "Semana passada" — o que saiu vs esperado nas red lines, qual o impacto real medido (risk-on/off, política monetária, fluxo).
  §2 "Semana à frente" — o que vem na agenda, quais cenários base/alternativo, o que trava/destrava cada ativo.
  §3 "Focus por ativo" — frase curta sobre o que vigiar em índices, ouro, BTC, dólar.
  Tom: técnico, direto, com analogia simples quando ajudar. Sem opinião, só fluxo e probabilidade.

Campo "daily_update" (1-2 parágrafos curtos, 80-150 palavras):
  Ajuste curto para o início da semana baseado em headlines ao vivo. Se não há headlines relevantes, indique que o cenário segue conforme o viés semanal. Evite repetir o que já está no weekly_bias.

Campo "asset_impacts": 4 ativos. Para cada um:
  - bias: "bullish" | "bearish" | "neutral"
  - confidence: "alta" | "media" | "baixa"
  - reason: 1-2 frases (PT-BR), ancoradas nas red lines e na agenda
  - key_levels: níveis técnicos (ex: "S&P 5800-5900")

JSON exato:
{"weekly_bias":"...","daily_update":"...","asset_impacts":{"indices":{"bias":"bullish","confidence":"alta","reason":"...","key_levels":"S&P 5800-5900"},"gold":{"bias":"bearish","confidence":"media","reason":"...","key_levels":"XAU/USD 2300-2350"},"btc":{"bias":"neutral","confidence":"baixa","reason":"...","key_levels":"BTC 65k-70k"},"dollar":{"bias":"bullish","confidence":"alta","reason":"...","key_levels":"DXY 104-106"}}}`;

  const response = await getAnthropic().messages.create({
    model: WEEKLY_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const raw = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const candidate = response.stop_reason === "end_turn" ? raw : repairTruncatedJson(raw);

  try {
    const parsed: NarrativeOutput = JSON.parse(candidate);
    validateAssetBias(parsed.asset_impacts, input);
    return parsed;
  } catch (e) {
    console.error("[narrative-generator] Failed to parse weekly JSON:", e);
    return FALLBACK_NARRATIVE;
  }
}

/**
 * Post-hoc sanity check on asset bias vs observed price action.
 * Prices aren't yet wired into this codebase, so for now we only log when
 * confidence="alta" contradicts the actuals signal from red lines
 * (e.g., bullish dollar + dovish-surprise rate cut in US). Non-blocking.
 */
function validateAssetBias(impacts: AssetImpacts, input: NarrativeInput): void {
  const prevHigh = (input.previousWeekEvents || []).filter(
    (e) => e.impact === "high" && e.actual
  );
  if (prevHigh.length === 0) return;

  // Lightweight heuristic: if any US rate/CPI surprise dovish, bullish dollar high-conf is suspicious.
  const dovishUsSurprise = prevHigh.some((e) => {
    if (e.country !== "US") return false;
    const titleLower = e.title.toLowerCase();
    const isRateOrCpi = titleLower.includes("rate") || titleLower.includes("cpi") || titleLower.includes("ppi");
    if (!isRateOrCpi) return false;
    const actual = parseFloat((e.actual || "").replace(/[^0-9.-]/g, ""));
    const forecast = parseFloat((e.forecast || "").replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(actual) || Number.isNaN(forecast)) return false;
    return actual < forecast;
  });

  if (dovishUsSurprise && impacts.dollar.bias === "bullish" && impacts.dollar.confidence === "alta") {
    console.warn(
      "[narrative-generator] Asset bias sanity: bullish-dollar-alta after dovish US surprise — review."
    );
  }
}

/**
 * Generate the daily adjustment: what changed since the weekly thesis based on
 * red lines (high-impact events with actuals filled in the last 24h).
 *
 * Keep it SHORT — 2 paragraphs, under 500 tokens. Compares directly against
 * the existing weekly bias and flags per-asset deltas.
 */
export interface DailyAdjustmentOutput {
  narrative: string;
  asset_updates: Partial<Record<"indices" | "gold" | "btc" | "dollar", DailyAdjustmentAssetUpdate>>;
}

export async function generateDailyAdjustment(params: {
  weeklyBias: string;
  redLines: DailyAdjustmentEvent[];
  currentAssetBias: AssetImpacts | null;
}): Promise<DailyAdjustmentOutput> {
  if (params.redLines.length === 0) {
    return {
      narrative:
        "Sem red lines novas nas últimas 24h. O cenário segue conforme o viés semanal.",
      asset_updates: {},
    };
  }

  const redLinesBlock = params.redLines
    .slice(0, 10)
    .map(
      (e) =>
        `- ${e.country} | ${e.title} | Fcst: ${e.forecast || "N/A"} | Actual: ${e.actual || "—"} | Prev: ${e.previous || "N/A"}`
    )
    .join("\n");

  const currentBiasBlock = params.currentAssetBias
    ? `VIÉS ATUAL POR ATIVO:
- Índices: ${params.currentAssetBias.indices.bias} (${params.currentAssetBias.indices.confidence})
- Ouro: ${params.currentAssetBias.gold.bias} (${params.currentAssetBias.gold.confidence})
- BTC: ${params.currentAssetBias.btc.bias} (${params.currentAssetBias.btc.confidence})
- Dólar: ${params.currentAssetBias.dollar.bias} (${params.currentAssetBias.dollar.confidence})
`
    : "";

  const userPrompt = `AJUSTE DIÁRIO — red lines que saíram nas últimas 24h.

TESE SEMANAL VIGENTE (resumo):
${params.weeklyBias.slice(0, 800)}

${currentBiasBlock}

RED LINES (${params.redLines.length}):
${redLinesBlock}

Gere JSON exato com:
- "narrative" (2 parágrafos curtos, 100-200 palavras total, PT-BR):
    §1 O que mudou vs a tese semanal — cite os resultados reais vs esperados.
    §2 Implicações por ativo — ajustes táticos para os próximos dias.
- "asset_updates": para cada ativo que MUDOU de convicção/direção em relação ao viés atual, inclua { "direction": "bullish"|"bearish"|"neutral", "delta_note": "curto, 1 frase, PT-BR" }. Se não mudou, omita o ativo.

Tom: direto, técnico, sem redundância com a tese semanal. Foque só no que as red lines revelaram.

JSON exato (exemplo — omita ativos sem mudança):
{"narrative":"...","asset_updates":{"dollar":{"direction":"bullish","delta_note":"CPI acima do consenso reforça Fed hawkish; DXY deve testar 106."}}}`;

  const response = await getAnthropic().messages.create({
    model: DAILY_ADJUSTMENT_MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const raw = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const candidate = response.stop_reason === "end_turn" ? raw : repairTruncatedJson(raw);

  try {
    const parsed = JSON.parse(candidate) as DailyAdjustmentOutput;
    return {
      narrative: parsed.narrative || "Ajuste indisponível.",
      asset_updates: parsed.asset_updates || {},
    };
  } catch (e) {
    console.error("[narrative-generator] Failed to parse daily adjustment JSON:", e);
    return {
      narrative: "Ajuste indisponível no momento. Tente novamente.",
      asset_updates: {},
    };
  }
}

/**
 * Generate adaptive re-analysis when a HIGH impact event diverges from forecast.
 * Returns a short update narrative (used by adaptive alert flow, not by daily adjustment).
 */
export async function generateAdaptiveUpdate(
  event: EconomicEvent,
  existingNarrative: string
): Promise<{ update_text: string; alert_title: string }> {
  const response = await getAnthropic().messages.create({
    model: ADAPTIVE_UPDATE_MODEL,
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
