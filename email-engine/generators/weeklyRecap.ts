// Per-user weekly recap payload. Reads journal_trades for last 7 days,
// aggregates PnL, win rate, top winner/loser, generates outcome-based
// lesson, and returns WeeklyRecapProps.

import { format, subDays } from "date-fns";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { TradeEntry, WeeklyRecapProps } from "../__mocks__/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://owealthinvesting.com";

export interface GenerateWeeklyRecapArgs {
  userId: string;
  email: string;
  firstName: string;
  weekEnd?: Date;
  unsubscribeUrl: string;
}

interface JournalTradeRow {
  symbol: string | null;
  direction: string | null;
  pnl_usd: number | null;
  net_pnl_usd: number | null;
  risk_usd: number | null;
  rr_realized: number | null;
  notes: string | null;
  opened_at: string;
}

function lessonForOutcome(args: {
  trades: number;
  pnlPct: number;
  winRate: number;
}): string {
  if (args.trades === 0) return "Semana sem trades. Revise sua tese.";
  if (args.pnlPct > 5) {
    return "Semana forte. Bons resultados vêm de processo, não de sorte. Mantenha o sizing.";
  }
  if (args.pnlPct > 0) {
    return "Semana positiva. Capital crescendo com disciplina. Continue documentando o que funciona.";
  }
  if (args.pnlPct < -5) {
    return "Drawdown relevante. Antes de aumentar tamanho, revise o que rompeu o plano.";
  }
  if (args.pnlPct < 0) {
    return "Semana negativa, mas controlada. Sizing pequeno é o que mantém você no jogo.";
  }
  return "Semana lateral. Capital preservado é capital pronto pra próxima oportunidade.";
}

function mapDirection(d: string | null): "long" | "short" {
  if (!d) return "long";
  const lower = d.toLowerCase();
  if (lower === "sell" || lower === "short") return "short";
  return "long";
}

export async function generateWeeklyRecap(
  args: GenerateWeeklyRecapArgs,
): Promise<WeeklyRecapProps> {
  const sb = createServiceRoleClient();
  const end = args.weekEnd ?? new Date();
  const start = subDays(end, 7);

  const { data, error } = await sb
    .from("journal_trades")
    .select(
      "symbol, direction, pnl_usd, net_pnl_usd, risk_usd, rr_realized, notes, opened_at",
    )
    .eq("user_id", args.userId)
    .gte("opened_at", start.toISOString())
    .lte("opened_at", end.toISOString())
    .order("opened_at", { ascending: true });

  if (error) {
    throw new Error(`weekly recap query failed: ${error.message}`);
  }

  const rows = (data ?? []) as JournalTradeRow[];
  const totalNetPnl = rows.reduce(
    (sum, r) => sum + (r.net_pnl_usd ?? r.pnl_usd ?? 0),
    0,
  );
  const totalRisk = rows.reduce((sum, r) => sum + (r.risk_usd ?? 0), 0);
  const winners = rows.filter(
    (r) => (r.net_pnl_usd ?? r.pnl_usd ?? 0) > 0,
  ).length;
  const winRate = rows.length > 0 ? (winners / rows.length) * 100 : 0;
  // Use realized RR average if risk_usd missing (older rows). Fallback 0.
  const pnlPct =
    totalRisk > 0
      ? (totalNetPnl / totalRisk) * 100
      : rows.reduce((sum, r) => sum + (r.rr_realized ?? 0), 0);

  const trades: TradeEntry[] = rows.map((r) => {
    const pnl = r.net_pnl_usd ?? r.pnl_usd ?? 0;
    const risk = r.risk_usd ?? 0;
    const tradePct = risk > 0 ? (pnl / risk) * 100 : (r.rr_realized ?? 0);
    return {
      asset: r.symbol ?? "—",
      direction: mapDirection(r.direction),
      pnl,
      pnlPct: tradePct,
      note: r.notes ? r.notes.slice(0, 120) : undefined,
    };
  });

  const lesson = lessonForOutcome({
    trades: rows.length,
    pnlPct,
    winRate,
  });

  return {
    date: format(end, "yyyy-MM-dd"),
    locale: "pt-BR",
    firstName: args.firstName,
    trades,
    pnlPct,
    winRate,
    lesson,
    unsubscribeUrl: args.unsubscribeUrl,
    appUrl: APP_URL,
  };
}

export interface EquityCurveUrlArgs {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
}

// Returns the URL Track A's WeeklyRecap template embeds via <Img src=...>.
// Resolved at render-time by /api/og/equity-curve which queries the same
// journal_trades window and rasterizes a sparkline.
export function buildEquityCurveUrl(args: EquityCurveUrlArgs): string {
  const params = new URLSearchParams({
    u: args.userId,
    s: format(args.weekStart, "yyyy-MM-dd"),
    e: format(args.weekEnd, "yyyy-MM-dd"),
  });
  return `${APP_URL}/api/og/equity-curve?${params.toString()}`;
}
