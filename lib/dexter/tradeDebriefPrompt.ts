import type { Plan } from "@/lib/subscription-shared";

export type DebriefMood = "default" | "thinking" | "alert" | "celebrating";

export interface TradeSnapshot {
  symbol: string | null;
  direction: "buy" | "sell" | null;
  netPnlUsd: number;
  riskUsd: number | null;
  rrRealized: number | null;
  openedAt: string | null;
  closedAt: string | null;
  durationMinutes: number | null;
  context: string | null;
  notes: string | null;
  mistakes: string[] | null;
  emotion: string | null;
  customTags: string[] | null;
  setupQuality: string | null;
}

export interface SimilarTrade {
  symbol: string | null;
  direction: "buy" | "sell" | null;
  netPnlUsd: number;
  closedAt: string | null;
}

export interface DebriefContext {
  plan: Plan;
  trade: TradeSnapshot;
  recentSameSymbol: SimilarTrade[];
  locale: "pt" | "en";
}

export function buildDebriefSystemPrompt(locale: "pt" | "en"): string {
  const langLine =
    locale === "en"
      ? "Respond in English."
      : "Responda em português brasileiro coloquial.";

  return `You are Dexter, a senior trading mentor. You reflect on a single trade the user just logged.
${langLine}

Voice:
- Direct, concise. 1-2 sentences max per field.
- Like a senior mentor — honest, not preachy, not motivational.
- No hedging, no clichés ("lembre-se", "never forget", "always remember").
- Speak to the trader in second person.

Output STRICT JSON, no markdown, no prose around it:
{
  "insight": "1-2 short sentences explaining what happened in this trade",
  "pattern": "optional 1 sentence if you spot a repeated behavior across the provided similar trades, else empty string",
  "mood": "default" | "thinking" | "alert" | "celebrating"
}

Rules:
- mood: "alert" for loss with clear mistake/emotion; "celebrating" for clean win with good setup; "thinking" for ambiguous/breakeven; "default" otherwise.
- Keep "insight" under 160 characters. Keep "pattern" under 140 characters.
- If no pattern from similar trades, return "pattern": "".
- Never fabricate numbers beyond what is provided.
- If context is empty, focus on R:R, duration, and P&L outcome.

HARD CONSTRAINTS — risk vs. position size:
- This is a leveraged trading account. Position size, notional value, contract value, lot size, and leverage are IRRELEVANT to risk and MUST NOT appear in your output.
- NEVER comment on "how much was risked" using position/notional figures. NEVER say things like "you risked $500k", "entered with $1M", "$50M position", "huge size for small return", "weight of the trade", "exposição", "tamanho da operação", "alavancagem".
- The ONLY valid measures of risk are: \`risk_usd\` (USD that would be lost if the stop hit) and \`rr_realized\` (R-multiple). If neither is provided, do not estimate or speculate about risk magnitude.
- Performance must be judged by P&L outcome relative to \`rr_realized\` and \`risk_usd\` only — never relative to implied position size.
- If the trade looks "small P&L for large size", that is a MISREADING of leverage. Ignore that framing entirely and focus instead on setup quality, R:R, emotion, mistakes, and execution.`;
}

export function buildDebriefUserPrompt(ctx: DebriefContext): string {
  const { trade, recentSameSymbol, locale } = ctx;
  const header = locale === "en" ? "Trade to debrief:" : "Trade pra debriefar:";

  const lines: string[] = [header];
  lines.push(`- symbol: ${trade.symbol ?? "?"}`);
  lines.push(`- direction: ${trade.direction ?? "?"}`);
  lines.push(`- net_pnl_usd: ${trade.netPnlUsd.toFixed(2)}`);
  if (trade.riskUsd != null) lines.push(`- risk_usd: ${trade.riskUsd.toFixed(2)}`);
  if (trade.rrRealized != null) lines.push(`- rr_realized: ${trade.rrRealized.toFixed(2)}`);
  if (trade.durationMinutes != null) {
    lines.push(`- duration_min: ${trade.durationMinutes}`);
  }
  if (trade.setupQuality) lines.push(`- setup_quality: ${trade.setupQuality}`);
  if (trade.emotion) lines.push(`- emotion: ${trade.emotion}`);
  if (trade.mistakes && trade.mistakes.length > 0) {
    lines.push(`- mistakes: ${trade.mistakes.join(", ")}`);
  }
  if (trade.customTags && trade.customTags.length > 0) {
    lines.push(`- tags: ${trade.customTags.join(", ")}`);
  }
  if (trade.context) lines.push(`- context: ${trade.context.slice(0, 280)}`);
  if (trade.notes) lines.push(`- notes: ${trade.notes.slice(0, 280)}`);

  if (recentSameSymbol.length > 0) {
    const formatted = recentSameSymbol
      .map(
        (t) =>
          `${t.direction ?? "?"}:${t.netPnlUsd >= 0 ? "+" : ""}${t.netPnlUsd.toFixed(2)}`
      )
      .join(", ");
    lines.push(`- last_${recentSameSymbol.length}_trades_same_symbol: ${formatted}`);
  }

  return lines.join("\n");
}

export interface ParsedDebrief {
  insight: string;
  pattern: string;
  mood: DebriefMood;
}

export function parseDebriefJson(raw: string): ParsedDebrief | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  try {
    const parsed = JSON.parse(cleaned) as {
      insight?: unknown;
      pattern?: unknown;
      mood?: unknown;
    };
    if (typeof parsed.insight !== "string") return null;
    const mood: DebriefMood =
      parsed.mood === "thinking" ||
      parsed.mood === "alert" ||
      parsed.mood === "celebrating"
        ? parsed.mood
        : "default";
    const pattern = typeof parsed.pattern === "string" ? parsed.pattern : "";
    return { insight: parsed.insight, pattern, mood };
  } catch {
    return null;
  }
}

export function fallbackDebrief(trade: TradeSnapshot, locale: "pt" | "en"): ParsedDebrief {
  const win = trade.netPnlUsd > 0;
  const loss = trade.netPnlUsd < 0;
  const mood: DebriefMood = loss ? "alert" : win ? "celebrating" : "thinking";
  if (locale === "en") {
    const msg = loss
      ? `Closed at ${trade.netPnlUsd.toFixed(2)}. Log what triggered the entry and whether the plan held.`
      : win
      ? `Clean exit at +${trade.netPnlUsd.toFixed(2)}. Mark the setup so you can repeat it.`
      : `Flat outcome. Worth reviewing whether the setup was actually worth taking.`;
    return { insight: msg, pattern: "", mood };
  }
  const msg = loss
    ? `Fechou em ${trade.netPnlUsd.toFixed(2)}. Anota o que te fez entrar e se o plano aguentou.`
    : win
    ? `Saída limpa em +${trade.netPnlUsd.toFixed(2)}. Marca o setup pra repetir.`
    : `Resultado raso. Vale olhar se o setup merecia mesmo a entrada.`;
  return { insight: msg, pattern: "", mood };
}
