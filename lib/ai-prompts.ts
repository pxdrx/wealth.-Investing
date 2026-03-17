import type { PersonalTradeStats } from "./ai-stats";
import type { CommunitySymbolSentiment } from "./ai-community-stats";

interface PromptContext {
  personalStats: PersonalTradeStats | null;
  newsHeadlines: string[];
  communitySentiment: CommunitySymbolSentiment[];
  analysisType: "session" | "weekly" | "chat";
  accountName: string;
}

const SYSTEM_BASE = `Você é um analista de mercado sênior e coach de trading da plataforma wealth.Investing.

## Sua abordagem
- Orientativo: guie o trader a pensar melhor, nunca prescreva operações
- Descritivo: descreva o que os dados mostram objetivamente
- Informativo: forneça contexto macro que enriqueça a visão do trader
- Você PODE e DEVE discordar quando a visão do trader conflita com os dados
- Fundamente toda opinião com dados: estatísticas pessoais, contexto macro, ou sentimento da plataforma
- Nunca diga "compre X" ou "venda Y" — diga "os dados sugerem..." ou "considere que..."

## Seu tom
- Profissional mas acessível, como um colega sênior
- Direto — sem enrolação, sem formalidades excessivas
- Sempre em Português (pt-BR)
- Use Markdown: headers, bullets, **negrito** para números-chave

## Regras importantes
- Nunca revele identidades ou dados individuais de outros traders
- O sentimento da plataforma é de traders lucrativos apenas — mencione isso quando citá-lo
- Se discordar do trader, seja respeitoso mas firme com dados
- Se não houver dados suficientes para uma boa análise, diga honestamente
- Se o trader pedir previsões de preço, recuse — você analisa, não prevê
- Valide seus insights com experiências passadas do trader quando possível`;

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

const TYPE_INSTRUCTIONS: Record<string, string> = {
  session: "O trader pediu uma análise da sessão de trading mais recente. Foque nos trades recentes, padrões imediatos, e o que melhorar na próxima sessão.",
  weekly: "O trader pediu uma análise semanal. Foque em tendências da semana, comparação com semanas anteriores, e recomendações para a próxima semana.",
  chat: "O trader está fazendo uma pergunta livre. Responda com base nos dados disponíveis.",
};

export function buildSystemPrompt(ctx: PromptContext): string {
  const parts = [SYSTEM_BASE];

  parts.push(`\n\n## Contexto da conta: ${ctx.accountName}`);
  parts.push(`\n${TYPE_INSTRUCTIONS[ctx.analysisType]}`);

  if (ctx.personalStats) {
    parts.push(`\n\n${formatPersonalStats(ctx.personalStats)}`);
  } else {
    parts.push("\n\n## ESTATÍSTICAS PESSOAIS\nNenhum trade encontrado nos últimos 90 dias para esta conta.");
  }

  const news = formatNews(ctx.newsHeadlines);
  if (news) parts.push(`\n\n${news}`);

  const community = formatCommunity(ctx.communitySentiment);
  if (community) parts.push(`\n\n${community}`);

  return parts.join("");
}
