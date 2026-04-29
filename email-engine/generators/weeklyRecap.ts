// Per-user weekly recap payload. Returns shape consumed by
// lib/email/templates/weekly-report.ts (renderWeeklyReport).
import {
  differenceInCalendarMonths,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { WeeklyRecapProps } from "../__mocks__/types";

export interface GenerateWeeklyRecapArgs {
  userId: string;
  email: string;
  firstName: string;
  weekEnd?: Date;
  unsubscribeUrl: string;
}

interface JournalTradeRow {
  symbol: string | null;
  pnl_usd: number | null;
  net_pnl_usd: number | null;
  opened_at: string;
}

const fmtDay = (d: Date) => format(d, "d 'de' MMMM", { locale: ptBR });
const pnlOf = (r: { pnl_usd: number | null; net_pnl_usd: number | null }) =>
  r.net_pnl_usd ?? r.pnl_usd ?? 0;

export async function generateWeeklyRecap(
  args: GenerateWeeklyRecapArgs,
): Promise<WeeklyRecapProps> {
  const sb = createServiceRoleClient();
  const end = endOfDay(args.weekEnd ?? new Date());
  const start = startOfDay(subDays(end, 6));

  // Primary query — must succeed.
  const { data: weekRows, error: weekErr } = await sb
    .from("journal_trades")
    .select("symbol, pnl_usd, net_pnl_usd, opened_at")
    .eq("user_id", args.userId)
    .gte("opened_at", start.toISOString())
    .lte("opened_at", end.toISOString());
  if (weekErr) throw new Error(`weekly recap query failed: ${weekErr.message}`);

  const rows = (weekRows ?? []) as JournalTradeRow[];
  const totalTrades = rows.length;
  const totalPnl = rows.reduce((s, r) => s + pnlOf(r), 0);
  const winners = rows.filter((r) => pnlOf(r) > 0).length;
  const winRate = totalTrades > 0 ? Math.round((winners / totalTrades) * 100) : 0;

  let bestTrade: WeeklyRecapProps["bestTrade"] = null;
  let worstTrade: WeeklyRecapProps["worstTrade"] = null;
  for (const r of rows) {
    const pnl = pnlOf(r);
    const sym = r.symbol ?? "—";
    if (pnl > 0 && (!bestTrade || pnl > bestTrade.pnl)) bestTrade = { symbol: sym, pnl };
    if (pnl < 0 && (!worstTrade || pnl < worstTrade.pnl)) worstTrade = { symbol: sym, pnl };
  }

  // Streak — supplementary; default 0 on error.
  let streak = 0;
  try {
    const since = subDays(end, 30);
    const { data: streakRows } = await sb
      .from("journal_trades")
      .select("pnl_usd, net_pnl_usd, opened_at")
      .eq("user_id", args.userId)
      .gte("opened_at", since.toISOString())
      .order("opened_at", { ascending: false });
    const byDay = new Map<string, number>();
    for (const r of streakRows ?? []) {
      const day = (r.opened_at as string).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + pnlOf(r));
    }
    let cursor = end;
    for (let i = 0; i < 30; i++) {
      const k = format(cursor, "yyyy-MM-dd");
      const sum = byDay.get(k);
      if (sum === undefined || sum <= 0) break;
      streak++;
      cursor = subDays(cursor, 1);
    }
  } catch (e) {
    console.warn("[weeklyRecap] streak calc failed", e);
  }

  // Total all-time count.
  let totalTradesAllTime = 0;
  try {
    const { count } = await sb
      .from("journal_trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", args.userId);
    totalTradesAllTime = count ?? 0;
  } catch (e) {
    console.warn("[weeklyRecap] count failed", e);
  }

  // Months of data since first trade.
  let monthsOfData = 1;
  try {
    const { data: firstRow } = await sb
      .from("journal_trades")
      .select("opened_at")
      .eq("user_id", args.userId)
      .order("opened_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstRow?.opened_at) {
      monthsOfData = Math.max(
        1,
        differenceInCalendarMonths(end, new Date(firstRow.opened_at)),
      );
    }
  } catch (e) {
    console.warn("[weeklyRecap] monthsOfData failed", e);
  }

  // Display name from profiles, fall through to firstName arg.
  let displayName = args.firstName;
  try {
    const { data: profile } = await sb
      .from("profiles")
      .select("display_name")
      .eq("id", args.userId)
      .maybeSingle();
    if (profile?.display_name) displayName = profile.display_name;
  } catch {
    /* fall through */
  }

  return {
    displayName,
    weekLabel: `Semana de ${fmtDay(start)} a ${fmtDay(end)}`,
    totalTrades,
    totalPnl,
    winRate,
    bestTrade,
    worstTrade,
    streak,
    totalTradesAllTime,
    monthsOfData,
    unsubscribeUrl: args.unsubscribeUrl,
  };
}
