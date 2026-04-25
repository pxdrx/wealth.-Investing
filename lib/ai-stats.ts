import { SupabaseClient } from "@supabase/supabase-js";
import { getSession, calcStreaks } from "@/lib/trade-analytics";
import { JournalTradeRow } from "@/components/journal/types";

export interface TradeRow {
  symbol: string;
  direction: string;
  pnl_usd: number;
  net_pnl_usd: number;
  fees_usd: number;
  opened_at: string;
  closed_at: string;
  rr_realized: number | null;
}

export interface SymbolStats {
  symbol: string;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
}

export interface SessionStats {
  session: string;
  tradeCount: number;
  winRate: number;
}

export interface DayStats {
  day: string;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
}

export interface WeeklyPnl {
  weekStart: string;
  pnl: number;
}

export interface PersonalTradeStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgRR: number;
  avgDurationMinutes: number;
  bySymbol: SymbolStats[];
  bySession: SessionStats[];
  byDay: DayStats[];
  streaks: { current: number; longestWin: number; longestLoss: number };
  weeklyPnl: WeeklyPnl[];
  recentTrades: { symbol: string; direction: string; pnl: number; date: string }[];
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export async function getPersonalTradeStats(
  client: SupabaseClient,
  accountId: string,
  userId: string
): Promise<PersonalTradeStats | null> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: trades, error } = await client
    .from("journal_trades")
    .select("symbol, direction, pnl_usd, net_pnl_usd, fees_usd, opened_at, closed_at, rr_realized")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .gte("closed_at", ninetyDaysAgo.toISOString())
    .order("closed_at", { ascending: true });

  if (error || !trades || trades.length === 0) return null;

  const typedTrades = trades as TradeRow[];
  const totalTrades = typedTrades.length;
  const wins = typedTrades.filter((t) => t.net_pnl_usd > 0);
  const losses = typedTrades.filter((t) => t.net_pnl_usd <= 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

  const grossWin = wins.reduce((s, t) => s + t.net_pnl_usd, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.net_pnl_usd, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  // Real per-trade R/R — only trades with a stop-loss contribute.
  // Matches lib/trade-analytics.ts so the AI prompt and the UI agree.
  const tradesWithRR = typedTrades.filter(
    (t) => t.rr_realized != null && Number.isFinite(t.rr_realized)
  );
  const avgRR =
    tradesWithRR.length > 0
      ? tradesWithRR.reduce((s, t) => s + (t.rr_realized as number), 0) /
        tradesWithRR.length
      : 0;

  // Average duration
  const durations = typedTrades.map((t) => {
    const open = new Date(t.opened_at).getTime();
    const close = new Date(t.closed_at).getTime();
    return (close - open) / 60000;
  });
  const avgDurationMinutes = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // By symbol (top 5)
  const symbolMap = new Map<string, TradeRow[]>();
  for (const t of typedTrades) {
    const arr = symbolMap.get(t.symbol) || [];
    arr.push(t);
    symbolMap.set(t.symbol, arr);
  }
  const bySymbol: SymbolStats[] = Array.from(symbolMap.entries())
    .map(([symbol, tds]) => ({
      symbol,
      tradeCount: tds.length,
      winRate: (tds.filter((t) => t.net_pnl_usd > 0).length / tds.length) * 100,
      avgPnl: tds.reduce((s, t) => s + t.net_pnl_usd, 0) / tds.length,
      totalPnl: tds.reduce((s, t) => s + t.net_pnl_usd, 0),
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, 5);

  // By session
  const sessionMap = new Map<string, TradeRow[]>();
  for (const t of typedTrades) {
    const sess = getSession(t.opened_at);
    const arr = sessionMap.get(sess) || [];
    arr.push(t);
    sessionMap.set(sess, arr);
  }
  const bySession: SessionStats[] = Array.from(sessionMap.entries())
    .map(([session, tds]) => ({
      session,
      tradeCount: tds.length,
      winRate: (tds.filter((t) => t.net_pnl_usd > 0).length / tds.length) * 100,
    }))
    .filter((s) => s.session !== "Other");

  // By day of week
  const dayMap = new Map<number, TradeRow[]>();
  for (const t of typedTrades) {
    const day = new Date(t.opened_at).getDay();
    const arr = dayMap.get(day) || [];
    arr.push(t);
    dayMap.set(day, arr);
  }
  const byDay: DayStats[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, tds]) => ({
      day: DAY_NAMES[day],
      tradeCount: tds.length,
      winRate: (tds.filter((t) => t.net_pnl_usd > 0).length / tds.length) * 100,
      avgPnl: tds.reduce((s, t) => s + t.net_pnl_usd, 0) / tds.length,
    }));

  // Weekly P&L (last 12 weeks)
  const weeklyMap = new Map<string, number>();
  for (const t of typedTrades) {
    const d = new Date(t.closed_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weeklyMap.set(key, (weeklyMap.get(key) || 0) + t.net_pnl_usd);
  }
  const weeklyPnl: WeeklyPnl[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([weekStart, pnl]) => ({ weekStart, pnl }));

  // Recent trades (last 10)
  const recentTrades = typedTrades
    .slice(-10)
    .reverse()
    .map((t) => ({
      symbol: t.symbol,
      direction: t.direction,
      pnl: t.net_pnl_usd,
      date: new Date(t.closed_at).toLocaleDateString("pt-BR"),
    }));

  const journalTrades: JournalTradeRow[] = typedTrades.map((t) => ({
    id: "",
    symbol: t.symbol,
    direction: t.direction,
    opened_at: t.opened_at,
    closed_at: t.closed_at,
    pnl_usd: t.pnl_usd,
    fees_usd: t.fees_usd,
    net_pnl_usd: t.net_pnl_usd,
    category: null,
    rr_realized: t.rr_realized,
  }));
  const streaks = calcStreaks(journalTrades);

  return {
    totalTrades,
    winRate,
    profitFactor,
    avgRR,
    avgDurationMinutes,
    bySymbol,
    bySession,
    byDay,
    streaks,
    weeklyPnl,
    recentTrades,
  };
}
