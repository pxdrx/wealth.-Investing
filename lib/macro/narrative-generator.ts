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
  const allMarkets = [
    ...TRACKED_MARKETS.forex,
    ...TRACKED_MARKETS.indices,
    ...TRACKED_MARKETS.commodities,
    ...TRACKED_MARKETS.crypto,
  ];

  const userPrompt = `Gere a análise semanal Smart Money Lab para ${input.weekStart} a ${input.weekEnd}.

EVENTOS DE ALTO IMPACTO DESTA SEMANA:
${highEvents.map((e) => `- ${e.date} ${e.time || "TBD"} | ${e.country} | ${e.title} | Prev: ${e.previous || "N/A"} | Forecast: ${e.forecast || "N/A"} | Actual: ${e.actual || "Pendente"}`).join("\n")}

TODOS OS EVENTOS (${input.events.length} total):
${input.events.map((e) => `- ${e.date} ${e.time || ""} | ${e.country} | ${e.title} [${e.impact}]`).join("\n")}

${input.teBriefing ? `CONTEXTO EDITORIAL (TradingEconomics):\n${input.teBriefing}\n` : ""}
${input.weekAheadEditorial ? `EDITORIAL "WEEK AHEAD" (TradingEconomics):\n${input.weekAheadEditorial}\n` : ""}${input.teHeadlines && input.teHeadlines.length > 0 ? `HEADLINES DE MERCADO (TradingEconomics):\n${input.teHeadlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}\n` : ""}${input.liveHeadlines && input.liveHeadlines.length > 0 ? `HEADLINES AO VIVO (últimas 48h — incorpore na análise):
${input.liveHeadlines
  .filter(h => h.impact === "breaking" || h.impact === "high")
  .slice(0, 15)
  .map((h, i) => `${i + 1}. [${h.source === "truth_social" ? "TRUTH SOCIAL" : "FINANCIAL JUICE"}${h.impact === "breaking" ? " — BREAKING" : ""}] ${h.headline} (${h.published_at || h.fetched_at})`)
  .join("\n")}
` : ""}
MERCADOS COBERTOS: ${allMarkets.join(", ")}

INSTRUÇÃO PARA O CAMPO "narrative":
Escreva um texto CONCISO e DIRETO (800-1200 palavras) em PT-BR, seguindo EXATAMENTE estas 7 seções na ordem. Use quebras de linha (\\n\\n) entre seções. Cada seção deve ter seu título em negrito com ** (ex: **1. Abertura — Visão Geral**).

1. **Abertura — Visão Geral**: Ciclo macro global atual. Crescimento vs desaceleração, inflação (quente ou esfriando?), política monetária (apertando, pausando, afrouxando?). Dê o tom da semana: risk-on, risk-off ou indefinido. Use uma analogia didática para situar o leitor.

2. **Estados Unidos**: Analise Payroll/ADP/JOLTS, IPC/PCE, ISM/PMIs, discursos do FED — com base nos eventos da semana. O que o FED precisa ver vs o que o mercado quer ouvir. Dados de emprego forte = bom para economia, ruim para corte de juros — explique essa tensão. Inclua uma analogia didática (ex: "O mercado está como um elástico esticado entre dois postes: dados fortes puxam o dólar, dados fracos puxam as bolsas").

3. **Europa**: Inflação, crescimento, mercado de trabalho, divergência entre países (Alemanha fraca vs serviços resilientes?). Por que EUR e GBP reagem ou congelam. BCE hawkish ou dovish? Impacto no EURUSD e GBPUSD.

4. **Ásia (China + Japão)**: China: crédito, PMI, consumo, deflação ou reflação? Japão: inflação, salários, política monetária do BOJ (yield curve control, hiking cycle?). Impacto indireto em USD, ouro, equities globais. Use analogia se relevante.

5. **Tradução para Trade**: Para cada bloco macro acima — risk-on ou risk-off? Carry trade é atrativo? Proteção (ouro, yen, franco suíço) ou lateralização? Onde o mercado está estressado (VIX, spreads) vs confortável? Conecte macro com ação prática.

6. **Tabela de Cenários**: Monte uma tabela em texto para DXY, EURUSD, GBPUSD, XAUUSD, Nasdaq, S&P500 e Bitcoin. Cada ativo com: Alta%, Lateral%, Baixa% e uma frase de narrativa. A soma de Alta+Lateral+Baixa DEVE ser 100% para cada ativo. Formato:
DXY: Alta 40% | Lateral 35% | Baixa 25% — "Dados fortes sustentam, mas teto existe."
(repita para todos os 7 ativos)

7. **Fechamento Lab**: Encerre com a frase: "Quem opera sem contexto está reagindo. Quem lê macro está se posicionando." Adicione 1-2 frases finais de contexto sobre a semana. Sem motivacional, sem bullshit — apenas verdade de mercado.

INSTRUÇÃO PARA OS DEMAIS CAMPOS:
- regional_analysis: Mapeie para americas/europe/asia_pacific com outlook (bullish/neutral/bearish) e key_events relevantes extraídos dos dados acima.
- market_impacts: Inclua TODOS os mercados cobertos (${allMarkets.join(", ")}), cada um com direction (bullish/bearish/neutral), conviction (0-100) e rationale em PT-BR.
- decision_intelligence: base_scenario (cenário mais provável, probability 50-70%) e alt_scenario (cenário alternativo, probability = 100 - base). conviction_map para TODOS os mercados cobertos com direction (long/short/neutral) e conviction (0-100).
- sentiment: bullish_pct + neutral_pct + bearish_pct = 100. Reflita o sentimento macro geral da semana.

Responda em JSON com esta estrutura exata:
{
  "narrative": "Texto completo de 1500-2500 palavras seguindo as 7 seções acima...",
  "regional_analysis": {
    "americas": { "title": "Américas", "summary": "...", "key_events": ["evento1", "evento2"], "outlook": "bullish|neutral|bearish" },
    "europe": { "title": "Europa", "summary": "...", "key_events": ["evento1"], "outlook": "bullish|neutral|bearish" },
    "asia_pacific": { "title": "Ásia-Pacífico", "summary": "...", "key_events": ["evento1"], "outlook": "bullish|neutral|bearish" }
  },
  "market_impacts": [
    { "asset": "EUR/USD", "direction": "bullish|bearish|neutral", "conviction": 75, "rationale": "..." }
  ],
  "decision_intelligence": {
    "base_scenario": { "title": "...", "probability": 60, "description": "...", "key_drivers": ["driver1"] },
    "alt_scenario": { "title": "...", "probability": 40, "description": "...", "key_drivers": ["driver1"] },
    "conviction_map": [
      { "asset": "EUR/USD", "direction": "long|short|neutral", "conviction": 75 }
    ]
  },
  "sentiment": { "bullish_pct": 40, "neutral_pct": 35, "bearish_pct": 25 }
}`;

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
