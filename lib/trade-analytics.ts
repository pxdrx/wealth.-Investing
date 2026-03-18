import { JournalTradeRow, getNetPnl } from "@/components/journal/types";

// ── Session helper (shared with ai-stats) ──────────────────────────
export function getSession(utcHour: number): string {
  if (utcHour >= 0 && utcHour < 8) return "Tokyo";
  if (utcHour >= 8 && utcHour < 14) return "London";
  if (utcHour >= 14 && utcHour < 21) return "New York";
  return "Other";
}

const DAY_NAMES = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

// ── Interfaces ──────────────────────────────────────────────────────

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
}

export interface DailyPnlPoint {
  date: string;
  pnl: number;
}

export interface SymbolBreakdownItem {
  symbol: string;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
}

export interface DirectionBreakdownItem {
  direction: string;
  tradeCount: number;
  winRate: number;
  totalPnl: number;
}

export interface DayOfWeekBreakdownItem {
  day: string;
  dayIndex: number;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
}

export interface SessionBreakdownItem {
  session: string;
  tradeCount: number;
  winRate: number;
  totalPnl: number;
}

export interface HourBreakdownItem {
  hour: number;
  tradeCount: number;
  winRate: number;
  totalPnl: number;
}

export interface Streaks {
  current: number;
  longestWin: number;
  longestLoss: number;
}

export interface TradeAnalytics {
  totalTrades: number;
  totalPnl: number;
  netPnl: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number;
  maxDrawdown: number;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  calmarRatio: number | null;
  kellyCriterion: number;
  recoveryFactor: number;
  bestDay: DailyPnlPoint | null;
  worstDay: DailyPnlPoint | null;
  streaks: Streaks;
  dailyStdDev: number;
  avgTradeDuration: number;
  tradesPerWeek: number;
  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];
  dailyPnl: DailyPnlPoint[];
  bySymbol: SymbolBreakdownItem[];
  byDirection: DirectionBreakdownItem[];
  byDayOfWeek: DayOfWeekBreakdownItem[];
  bySession: SessionBreakdownItem[];
  byHour: HourBreakdownItem[];
}

// ── Shared helpers ──────────────────────────────────────────────────

export function calcStreaks(trades: JournalTradeRow[]): Streaks {
  let longestWin = 0;
  let longestLoss = 0;
  let streak = 0;

  const sorted = [...trades].sort(
    (a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime()
  );

  for (const t of sorted) {
    const pnl = getNetPnl(t);
    if (pnl > 0) {
      streak = streak > 0 ? streak + 1 : 1;
      longestWin = Math.max(longestWin, streak);
    } else {
      streak = streak < 0 ? streak - 1 : -1;
      longestLoss = Math.max(longestLoss, Math.abs(streak));
    }
  }
  return { current: streak, longestWin, longestLoss };
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key) || [];
    arr.push(item);
    map.set(key, arr);
  }
  return map;
}

function winRateOf(trades: JournalTradeRow[]): number {
  if (trades.length === 0) return 0;
  return (trades.filter((t) => getNetPnl(t) > 0).length / trades.length) * 100;
}

function totalPnlOf(trades: JournalTradeRow[]): number {
  return trades.reduce((s, t) => s + getNetPnl(t), 0);
}

// ── Main computation ────────────────────────────────────────────────

export function computeTradeAnalytics(trades: JournalTradeRow[]): TradeAnalytics {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime()
  );

  const totalTrades = sorted.length;
  const pnls = sorted.map(getNetPnl);
  const grossPnls = sorted.map((t) => t.pnl_usd ?? 0);

  const totalPnl = grossPnls.reduce((a, b) => a + b, 0);
  const netPnl = pnls.reduce((a, b) => a + b, 0);

  const wins = sorted.filter((t) => getNetPnl(t) > 0);
  const losses = sorted.filter((t) => getNetPnl(t) <= 0);

  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

  const grossWin = wins.reduce((s, t) => s + getNetPnl(t), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + getNetPnl(t), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  const expectancy = totalTrades > 0 ? netPnl / totalTrades : 0;

  // ── Daily PnL ──
  const dailyMap = groupBy(sorted, (t) => t.closed_at.slice(0, 10));
  const dailyPnl: DailyPnlPoint[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tds]) => ({
      date,
      pnl: tds.reduce((s, t) => s + getNetPnl(t), 0),
    }));

  const dailyPnlValues = dailyPnl.map((d) => d.pnl);
  const tradingDays = dailyPnl.length;

  // ── Best/Worst day ──
  const bestDay = dailyPnl.length > 0
    ? dailyPnl.reduce((best, d) => (d.pnl > best.pnl ? d : best))
    : null;
  const worstDay = dailyPnl.length > 0
    ? dailyPnl.reduce((worst, d) => (d.pnl < worst.pnl ? d : worst))
    : null;

  // ── Daily Std Dev ──
  const meanDaily = tradingDays > 0 ? dailyPnlValues.reduce((a, b) => a + b, 0) / tradingDays : 0;
  const dailyVariance = tradingDays > 1
    ? dailyPnlValues.reduce((s, v) => s + (v - meanDaily) ** 2, 0) / (tradingDays - 1)
    : 0;
  const dailyStdDev = Math.sqrt(dailyVariance);

  // ── Equity Curve ──
  let cumulative = 0;
  const equityCurve: EquityPoint[] = dailyPnl.map((d) => {
    cumulative += d.pnl;
    return { date: d.date, equity: cumulative };
  });

  // ── Max Drawdown & Drawdown Curve ──
  let peak = 0;
  let maxDrawdown = 0;
  const drawdownCurve: DrawdownPoint[] = equityCurve.map((pt) => {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak > 0 ? ((pt.equity - peak) / peak) * 100 : 0;
    if (Math.abs(dd) > Math.abs(maxDrawdown)) maxDrawdown = dd;
    return { date: pt.date, drawdown: dd };
  });
  maxDrawdown = Math.abs(maxDrawdown);

  // ── Sharpe Ratio (annualized, need 20+ trading days) ──
  const sharpeRatio = tradingDays >= 20 && dailyStdDev > 0
    ? (meanDaily / dailyStdDev) * Math.sqrt(252)
    : null;

  // ── Sortino Ratio (annualized, need 20+ trading days) ──
  const downsidePnls = dailyPnlValues.filter((v) => v < 0);
  const downsideVariance = downsidePnls.length > 0
    ? downsidePnls.reduce((s, v) => s + v ** 2, 0) / tradingDays
    : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = tradingDays >= 20 && downsideStdDev > 0
    ? (meanDaily / downsideStdDev) * Math.sqrt(252)
    : null;

  // ── Calmar Ratio ──
  const calmarRatio = tradingDays >= 20 && maxDrawdown > 0
    ? (netPnl / maxDrawdown)
    : null;

  // ── Kelly Criterion (half-Kelly, capped 0.5) ──
  const winProb = totalTrades > 0 ? wins.length / totalTrades : 0;
  const lossProb = 1 - winProb;
  const rawKelly = payoffRatio > 0 && lossProb > 0
    ? (winProb * payoffRatio - lossProb) / payoffRatio
    : 0;
  const kellyCriterion = Math.min(Math.max(rawKelly * 0.5, 0), 0.5);

  // ── Recovery Factor ──
  const recoveryFactor = maxDrawdown > 0 ? netPnl / maxDrawdown : 0;

  // ── Streaks ──
  const streaks = calcStreaks(sorted);

  // ── Avg Trade Duration (minutes) ──
  const durations = sorted.map((t) => {
    const open = new Date(t.opened_at).getTime();
    const close = new Date(t.closed_at).getTime();
    return (close - open) / 60000;
  }).filter((d) => d >= 0);
  const avgTradeDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  // ── Trades per week ──
  const firstDate = sorted.length > 0 ? new Date(sorted[0].closed_at) : new Date();
  const lastDate = sorted.length > 0 ? new Date(sorted[sorted.length - 1].closed_at) : new Date();
  const weekSpan = Math.max((lastDate.getTime() - firstDate.getTime()) / (7 * 86400000), 1);
  const tradesPerWeek = totalTrades / weekSpan;

  // ── By Symbol ──
  const bySymbol: SymbolBreakdownItem[] = Array.from(
    groupBy(sorted, (t) => t.symbol).entries()
  )
    .map(([symbol, tds]) => ({
      symbol,
      tradeCount: tds.length,
      winRate: winRateOf(tds),
      avgPnl: totalPnlOf(tds) / tds.length,
      totalPnl: totalPnlOf(tds),
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  // ── By Direction ──
  const byDirection: DirectionBreakdownItem[] = Array.from(
    groupBy(sorted, (t) => t.direction).entries()
  )
    .map(([direction, tds]) => ({
      direction,
      tradeCount: tds.length,
      winRate: winRateOf(tds),
      totalPnl: totalPnlOf(tds),
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  // ── By Day of Week ──
  const byDayOfWeek: DayOfWeekBreakdownItem[] = Array.from(
    groupBy(sorted, (t) => String(new Date(t.opened_at).getDay())).entries()
  )
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([dayIdx, tds]) => ({
      day: DAY_NAMES[Number(dayIdx)],
      dayIndex: Number(dayIdx),
      tradeCount: tds.length,
      winRate: winRateOf(tds),
      avgPnl: totalPnlOf(tds) / tds.length,
    }));

  // ── By Session ──
  const bySession: SessionBreakdownItem[] = Array.from(
    groupBy(sorted, (t) => getSession(new Date(t.opened_at).getUTCHours())).entries()
  )
    .map(([session, tds]) => ({
      session,
      tradeCount: tds.length,
      winRate: winRateOf(tds),
      totalPnl: totalPnlOf(tds),
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  // ── By Hour ──
  const byHour: HourBreakdownItem[] = Array.from(
    groupBy(sorted, (t) => String(new Date(t.opened_at).getUTCHours())).entries()
  )
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([hour, tds]) => ({
      hour: Number(hour),
      tradeCount: tds.length,
      winRate: winRateOf(tds),
      totalPnl: totalPnlOf(tds),
    }));

  return {
    totalTrades,
    totalPnl,
    netPnl,
    winRate,
    profitFactor,
    expectancy,
    avgWin,
    avgLoss,
    payoffRatio,
    maxDrawdown,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    kellyCriterion,
    recoveryFactor,
    bestDay,
    worstDay,
    streaks,
    dailyStdDev,
    avgTradeDuration,
    tradesPerWeek,
    equityCurve,
    drawdownCurve,
    dailyPnl,
    bySymbol,
    byDirection,
    byDayOfWeek,
    bySession,
    byHour,
  };
}
