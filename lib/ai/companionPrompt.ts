/**
 * System prompt builder for the Dexter Companion (chat tab).
 *
 * The Companion is Ticker — an ambient, personality-first chat surface that
 * sits alongside the Coach (structured reflection) and the Analyst (ticker
 * research). Tone: concise, direct, PT-BR, emoji parcimônia.
 *
 * The prompt is stable across a session so it MUST be sent as the cacheable
 * `system` block with `cache_control: { type: "ephemeral" }` in the Anthropic
 * request (see `/api/ai/companion/route.ts`).
 */

export interface CompanionOpenPosition {
  symbol: string;
  direction: "long" | "short" | null;
  opened_at: string | null;
  unrealized_pnl_usd: number | null;
}

export interface CompanionMacroEvent {
  title: string;
  country: string | null;
  /** ISO string of event release time. */
  release_at: string | null;
  /** Human-friendly delta e.g. "em 2h", "amanhã 14:30". */
  whenRelative: string | null;
  impact: "low" | "medium" | "high" | string | null;
}

export interface CompanionHeadline {
  title: string;
  source: string;
  published_at: string | null;
}

export interface CompanionContext {
  accountName: string;
  accountCurrency: string;
  /** Realised P&L for the current trading day (account base currency). */
  todayPnlUsd: number | null;
  todayTradeCount: number;
  openPositions: CompanionOpenPosition[];
  /** Closest upcoming macro event inside the 24h window. */
  nextEvent: CompanionMacroEvent | null;
  /** Top 3 relevant headlines from the last 24h. */
  recentHeadlines: CompanionHeadline[];
  /** Optional client-inferred mood tag. Never trust blindly. */
  mood?: string | null;
}

function formatPnl(pnl: number | null, currency: string): string {
  if (pnl === null || Number.isNaN(pnl)) return "sem trades hoje";
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${pnl.toFixed(2)} ${currency}`;
}

function formatOpenPositions(positions: CompanionOpenPosition[]): string {
  if (positions.length === 0) return "nenhuma posição aberta";
  return positions
    .slice(0, 5)
    .map((p) => {
      const dir = p.direction ?? "?";
      const pnl =
        p.unrealized_pnl_usd !== null
          ? ` (${p.unrealized_pnl_usd >= 0 ? "+" : ""}${p.unrealized_pnl_usd.toFixed(2)} USD)`
          : "";
      return `${p.symbol} ${dir}${pnl}`;
    })
    .join(", ");
}

function formatNextEvent(ev: CompanionMacroEvent | null): string {
  if (!ev) return "nada relevante nas próximas 24h";
  const when = ev.whenRelative ?? ev.release_at ?? "sem horário";
  const country = ev.country ? ` (${ev.country})` : "";
  const impact = ev.impact ? ` — ${ev.impact}` : "";
  return `${ev.title}${country} ${when}${impact}`;
}

function formatHeadlines(h: CompanionHeadline[]): string {
  if (h.length === 0) return "nenhuma manchete relevante nas últimas 24h";
  return h
    .slice(0, 3)
    .map((x) => `• ${x.title} [${x.source}]`)
    .join("\n");
}

export function buildCompanionSystem(ctx: CompanionContext): string {
  return `Você é Ticker, o companheiro ambiente do trader dentro do Dexter.

PERSONA
- Conciso, direto, PT-BR. Frases curtas.
- Acolhedor mas nunca bajulador. Emoji com parcimônia (no máximo 1 por resposta).
- Não soa como analista institucional — soa como um parceiro de mesa atento.
- Se o usuário estiver frustrado ou tilted, reconhece e sugere pausa ou /coach antes de empurrar ação.

FERRAMENTAS À DISPOSIÇÃO DO USUÁRIO (sugira quando fizer sentido)
- /coach → reflexão profunda sobre a sessão, semana ou um trade (tab Coach).
- /analyst <TICKER> → análise técnica estruturada de um ativo (tab Analyst).
- /trade → registrar um novo trade no journal.
- /mood → registrar humor atual.

CONTEXTO AO VIVO (use como pano de fundo, NÃO repita verbatim no output)
- Conta: ${ctx.accountName} (${ctx.accountCurrency})
- P&L realizado hoje: ${formatPnl(ctx.todayPnlUsd, ctx.accountCurrency)}
- Trades fechados hoje: ${ctx.todayTradeCount}
- Posições abertas: ${formatOpenPositions(ctx.openPositions)}
- Próximo evento macro (24h): ${formatNextEvent(ctx.nextEvent)}
- Humor inferido: ${ctx.mood ?? "desconhecido"}
- Manchetes últimas 24h:
${formatHeadlines(ctx.recentHeadlines)}

REGRAS DURAS
1. NUNCA invente números, preços, estatísticas ou manchetes. Se não está no CONTEXTO, diga "não tenho esse dado agora".
2. NÃO recomende operações específicas (não é Analyst). Se o usuário pedir tese de ativo, sugira /analyst <ticker>.
3. NÃO refaça análise psicológica estruturada (não é Coach). Se o usuário quer reflexão profunda, sugira /coach.
4. Respeite o que o usuário acabou de dizer — não repita o contexto de volta em lista.
5. Respostas geralmente cabem em 1–3 parágrafos curtos. Mais que isso só se o usuário pedir.`;
}
