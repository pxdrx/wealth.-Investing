import type { PersonalTradeStats } from "./ai-stats";
import type { CommunitySymbolSentiment } from "./ai-community-stats";
import type { TradeAnalytics } from "./trade-analytics";
import type { JournalTradeRow } from "@/components/journal/types";
import { getNetPnl } from "@/components/journal/types";

export interface MacroContext {
  headlines: { headline: string; source: string; impact: string }[];
  panorama: string | null;
  dailyUpdate: string | null;
  highImpactEvents: { title: string; date: string; time: string | null; country: string; forecast: string | null; previous: string | null; actual: string | null }[];
  rates: { bank_code: string; current_rate: number; last_action: string }[];
}

interface PromptContext {
  personalStats: PersonalTradeStats | null;
  newsHeadlines: string[];
  communitySentiment: CommunitySymbolSentiment[];
  analysisType: "session" | "weekly" | "chat";
  accountName: string;
  tradeAnalytics?: TradeAnalytics | null;
  psychologyProfile?: string | null;
  macroContext?: MacroContext | null;
}

const SYSTEM_BASE = `Voce e o AI Coach da plataforma wealth.Investing. Analista de trading senior.

## Tom e estilo
- Direto e objetivo. Sem floreios, sem analogias desnecessarias, sem motivacao barata.
- Cada frase deve ter peso. Se nao agrega, nao fale.
- Fale como um trader experiente que nao tem tempo a perder.
- Dados primeiro, opiniao depois. Sempre com base nos numeros.
- Nao use emojis. Nao seja simpatico. Seja util.
- Formato: bullets curtos, numeros em destaque, conclusao no inicio.
- Sempre em Portugues (pt-BR).
- Use Markdown: headers, bullets, **negrito** para numeros-chave.

## Abordagem
- Conclusao primeiro, justificativa depois.
- Cite numeros especificos — nunca generalize sem dados.
- Se os dados mostram que o trader esta fazendo besteira, diga. Sem rodeios.
- Nunca diga "compre X" ou "venda Y" — diga "os dados mostram..." ou "o padrao indica..."
- Se nao ha dados suficientes, diga em uma frase e pare.
- Se o trader pedir previsao de preco, recuse.

## Macro
Quando relevante, responda objetivamente:
- Crescimento ou desaceleracao?
- Inflacao: resiliente ou desinflacao?
- Banco central: hawkish, dovish, neutro?
- Implicacao: risco on/off?

## Regras
- Nunca revele dados de outros traders.
- Sentimento da plataforma = apenas traders lucrativos. Mencione isso ao citar.
- Discorde com dados, nao com opiniao.
- Nao invente estatisticas que nao estejam no contexto fornecido.`;

function formatPersonalStats(stats: PersonalTradeStats): string {
  const lines: string[] = [
    "## ESTATÍSTICAS PESSOAIS (últimos 90 dias)",
    "",
    `- Total de trades: **${stats.totalTrades}**`,
    `- Win rate: **${stats.winRate.toFixed(1)}%**`,
    `- Profit factor: **${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}**`,
    `- RR médio: **${stats.avgRR.toFixed(2)}**`,
    `- Duração média: **${Math.round(stats.avgDurationMinutes)} min**`,
    "",
    "### Por par (top 5)",
  ];

  for (const s of stats.bySymbol) {
    lines.push(`- ${s.symbol}: ${s.tradeCount} trades, WR ${s.winRate.toFixed(1)}%, P&L total $${s.totalPnl.toFixed(2)}`);
  }

  lines.push("", "### Por sessão");
  for (const s of stats.bySession) {
    lines.push(`- ${s.session}: ${s.tradeCount} trades, WR ${s.winRate.toFixed(1)}%`);
  }

  lines.push("", "### Por dia da semana");
  for (const d of stats.byDay) {
    lines.push(`- ${d.day}: ${d.tradeCount} trades, WR ${d.winRate.toFixed(1)}%, média $${d.avgPnl.toFixed(2)}`);
  }

  lines.push("", "### Streaks");
  lines.push(`- Atual: ${stats.streaks.current > 0 ? `+${stats.streaks.current} wins` : `${stats.streaks.current} losses`}`);
  lines.push(`- Maior sequência de wins: ${stats.streaks.longestWin}`);
  lines.push(`- Maior sequência de losses: ${stats.streaks.longestLoss}`);

  lines.push("", "### P&L semanal (últimas 12 semanas)");
  for (const w of stats.weeklyPnl) {
    lines.push(`- ${w.weekStart}: $${w.pnl.toFixed(2)}`);
  }

  lines.push("", "### Últimos 10 trades");
  for (const t of stats.recentTrades) {
    lines.push(`- ${t.date}: ${t.symbol} ${t.direction} → $${t.pnl.toFixed(2)}`);
  }

  return lines.join("\n");
}

function formatCommunity(sentiment: CommunitySymbolSentiment[]): string {
  if (sentiment.length === 0) return "";

  const lines = [
    "## SENTIMENTO DA PLATAFORMA (traders lucrativos, últimos 7 dias)",
    "",
  ];
  for (const s of sentiment) {
    lines.push(`- ${s.symbol}: ${s.longPct}% long / ${s.shortPct}% short (${s.traderCount} traders)`);
  }
  return lines.join("\n");
}

function formatNews(headlines: string[]): string {
  if (headlines.length === 0) return "";
  const lines = ["## CONTEXTO MACRO ATUAL", ""];
  for (const h of headlines) {
    lines.push(`- ${h}`);
  }
  return lines.join("\n");
}

function formatMacroContext(macro: MacroContext): string {
  const lines: string[] = ["## INTELIGÊNCIA MACRO (dados do site)", ""];

  // Panorama semanal
  if (macro.panorama) {
    lines.push("### Panorama da Semana");
    lines.push(macro.panorama);
    lines.push("");
  }

  // Daily update
  if (macro.dailyUpdate) {
    lines.push("### Atualização do Dia");
    lines.push(macro.dailyUpdate);
    lines.push("");
  }

  // Headlines recentes
  if (macro.headlines.length > 0) {
    lines.push("### Headlines Recentes");
    for (const h of macro.headlines) {
      const tag = h.impact === "breaking" ? "[BREAKING]" : h.impact === "high" ? "[ALTO]" : "";
      lines.push(`- ${tag} ${h.headline} (${h.source})`);
    }
    lines.push("");
  }

  // Eventos econômicos de alto impacto
  if (macro.highImpactEvents.length > 0) {
    lines.push("### Eventos Econômicos de Alto Impacto (esta semana)");
    for (const e of macro.highImpactEvents) {
      const time = e.time ? ` ${e.time}` : "";
      const actual = e.actual ? ` | Real: ${e.actual}` : "";
      const forecast = e.forecast ? ` | Prev: ${e.forecast}` : "";
      const prev = e.previous ? ` | Ant: ${e.previous}` : "";
      lines.push(`- ${e.date}${time} ${e.country}: ${e.title}${forecast}${prev}${actual}`);
    }
    lines.push("");
  }

  // Taxas de juros
  if (macro.rates.length > 0) {
    lines.push("### Taxas de Juros Atuais");
    for (const r of macro.rates) {
      const action = r.last_action === "hike" ? "↑" : r.last_action === "cut" ? "↓" : "→";
      lines.push(`- ${r.bank_code}: ${r.current_rate}% ${action}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

const TYPE_INSTRUCTIONS: Record<string, string> = {
  session: "O trader pediu uma análise da sessão de trading mais recente. Foque nos trades recentes, padrões imediatos, e o que melhorar na próxima sessão. Se identificar padrões de tilt ou overtrading, seja direto — use os dados para mostrar o impacto.",
  weekly: "O trader pediu uma análise semanal. Foque em tendências da semana, comparação com semanas anteriores, e recomendações para a próxima semana. Conecte o desempenho ao contexto macro quando possível — o trader precisa entender se operou a favor ou contra o fluxo.",
  chat: "O trader está fazendo uma pergunta livre. Responda com base nos dados disponíveis. Se a pergunta envolver macro, use o framework: crescimento/desaceleração, inflação, política monetária, e implicação para risco.",
};

export function formatTradeAnalytics(analytics: TradeAnalytics): string {
  const lines: string[] = [
    "## ANALYTICS COMPLETO",
    "",
    `- Total trades: **${analytics.totalTrades}**`,
    `- P&L líquido: **$${analytics.netPnl.toFixed(2)}**`,
    `- Win rate: **${analytics.winRate.toFixed(1)}%**`,
    `- Profit factor: **${analytics.profitFactor === Infinity ? "Infinito (sem perdas)" : analytics.profitFactor.toFixed(2)}**`,
    `- Expectancy: **$${analytics.expectancy.toFixed(2)}** por trade`,
    `- Payoff ratio: **${analytics.payoffRatio.toFixed(2)}**`,
    `- Max drawdown: **${analytics.maxDrawdown.toFixed(1)}%**`,
    `- Sharpe ratio: **${analytics.sharpeRatio?.toFixed(2) ?? "N/A"}**`,
    `- Sortino ratio: **${analytics.sortinoRatio?.toFixed(2) ?? "N/A"}**`,
    `- Kelly (half): **${(analytics.kellyCriterion * 100).toFixed(1)}%**`,
    `- Recovery factor: **${analytics.recoveryFactor.toFixed(2)}**`,
    `- Média ganho: **$${analytics.avgWin.toFixed(2)}**`,
    `- Média perda: **$${analytics.avgLoss.toFixed(2)}**`,
    `- Duração média: **${Math.round(analytics.avgTradeDuration)} min**`,
    `- Trades/semana: **${analytics.tradesPerWeek.toFixed(1)}**`,
  ];

  if (analytics.bestDay) {
    lines.push(`- Melhor dia: **${analytics.bestDay.date}** ($${analytics.bestDay.pnl.toFixed(2)})`);
  }
  if (analytics.worstDay) {
    lines.push(`- Pior dia: **${analytics.worstDay.date}** ($${analytics.worstDay.pnl.toFixed(2)})`);
  }

  lines.push("", "### Top símbolos");
  for (const s of analytics.bySymbol.slice(0, 8)) {
    lines.push(`- ${s.symbol}: ${s.tradeCount} trades, WR ${s.winRate.toFixed(1)}%, total $${s.totalPnl.toFixed(2)}`);
  }

  lines.push("", "### Por sessão");
  for (const s of analytics.bySession) {
    lines.push(`- ${s.session}: ${s.tradeCount} trades, WR ${s.winRate.toFixed(1)}%, total $${s.totalPnl.toFixed(2)}`);
  }

  lines.push("", "### Por dia da semana");
  for (const d of analytics.byDayOfWeek) {
    lines.push(`- ${d.day}: ${d.tradeCount} trades, WR ${d.winRate.toFixed(1)}%, média $${d.avgPnl.toFixed(2)}`);
  }

  lines.push("", "### Por hora (top 5 por volume)");
  const topHours = [...analytics.byHour].sort((a, b) => b.tradeCount - a.tradeCount).slice(0, 5);
  for (const h of topHours) {
    lines.push(`- ${h.hour}h UTC: ${h.tradeCount} trades, WR ${h.winRate.toFixed(1)}%`);
  }

  return lines.join("\n");
}

export function formatPsychologyProfile(trades: JournalTradeRow[]): string {
  const withEmotion = trades.filter((t) => t.emotion);
  if (withEmotion.length === 0) return "";

  const emotionMap = new Map<string, { count: number; wins: number; totalPnl: number }>();
  for (const t of withEmotion) {
    const e = t.emotion!;
    const entry = emotionMap.get(e) || { count: 0, wins: 0, totalPnl: 0 };
    entry.count++;
    const pnl = getNetPnl(t);
    if (pnl > 0) entry.wins++;
    entry.totalPnl += pnl;
    emotionMap.set(e, entry);
  }

  const withDiscipline = trades.filter((t) => t.discipline);
  const disciplineMap = new Map<string, { count: number; wins: number }>();
  for (const t of withDiscipline) {
    const d = t.discipline!;
    const entry = disciplineMap.get(d) || { count: 0, wins: 0 };
    entry.count++;
    if (getNetPnl(t) > 0) entry.wins++;
    disciplineMap.set(d, entry);
  }

  // Tilt score: % of trades with negative emotions (FOMO, Medo, Raiva, Frustrado)
  const negativeEmotions = ["FOMO", "Medo", "Raiva", "Frustrado", "Ansioso"];
  const negCount = withEmotion.filter((t) => negativeEmotions.includes(t.emotion!)).length;
  const tiltScore = withEmotion.length > 0 ? (negCount / withEmotion.length) * 100 : 0;

  const lines: string[] = [
    "## PERFIL PSICOLÓGICO",
    "",
    `- Trades com emoção registrada: **${withEmotion.length}** de ${trades.length}`,
    `- Tilt score: **${tiltScore.toFixed(1)}%** (% de trades com emoções negativas)`,
    "",
    "### Por emoção",
  ];

  Array.from(emotionMap.entries()).forEach(([emotion, stats]) => {
    const wr = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
    lines.push(`- ${emotion}: ${stats.count} trades, WR ${wr.toFixed(1)}%, P&L $${stats.totalPnl.toFixed(2)}`);
  });

  if (disciplineMap.size > 0) {
    lines.push("", "### Por disciplina");
    Array.from(disciplineMap.entries()).forEach(([disc, stats]) => {
      const wr = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      lines.push(`- ${disc}: ${stats.count} trades, WR ${wr.toFixed(1)}%`);
    });
  }

  return lines.join("\n");
}

const QA_RULES = `
## Regras adicionais para Q&A
- SEMPRE cite numeros especificos dos dados fornecidos
- NUNCA invente dados ou estatisticas que nao estejam no contexto
- Seja solidario sobre emocoes — reconheca o impacto psicologico do trading
- Se o trader perguntar algo que os dados nao cobrem, diga honestamente
- Quando analisar psicologia, sugira melhorias concretas e acionaveis
`;

export function buildSystemPrompt(ctx: PromptContext): string {
  const parts = [SYSTEM_BASE];

  parts.push(`\n\n## Contexto da conta: ${ctx.accountName}`);
  parts.push(`\n${TYPE_INSTRUCTIONS[ctx.analysisType]}`);

  if (ctx.personalStats) {
    parts.push(`\n\n${formatPersonalStats(ctx.personalStats)}`);
  } else {
    parts.push("\n\n## ESTATÍSTICAS PESSOAIS\nNenhum trade encontrado nos últimos 90 dias para esta conta.");
  }

  if (ctx.tradeAnalytics && ctx.tradeAnalytics.totalTrades > 0) {
    parts.push(`\n\n${formatTradeAnalytics(ctx.tradeAnalytics)}`);
  }

  if (ctx.psychologyProfile) {
    parts.push(`\n\n${ctx.psychologyProfile}`);
  }

  // Prefer rich macro context from site data; fall back to simple headlines
  if (ctx.macroContext) {
    const macro = formatMacroContext(ctx.macroContext);
    if (macro) parts.push(`\n\n${macro}`);
  } else {
    const news = formatNews(ctx.newsHeadlines);
    if (news) parts.push(`\n\n${news}`);
  }

  const community = formatCommunity(ctx.communitySentiment);
  if (community) parts.push(`\n\n${community}`);

  // Add Q&A rules when in chat mode with enriched data
  if (ctx.analysisType === "chat" && (ctx.tradeAnalytics || ctx.psychologyProfile)) {
    parts.push(`\n\n${QA_RULES}`);
  }

  return parts.join("");
}
