import { JournalTradeRow, getNetPnl } from "@/components/journal/types";

// ── Session helper (shared with ai-stats) ──────────────────────────
export function getSession(utcHour: number): string {
  if (utcHour >= 0 && utcHour < 8) return "Tokyo";
  if (utcHour >= 8 && utcHour < 14) return "London";
  if (utcHour >= 14 && utcHour < 21) return "New York";
  return "Other";
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

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
  winCount: number;
  lossCount: number;
  totalWinPnl: number;
  totalLossPnl: number;
  netPnl: number;
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
  winCount: number;
  lossCount: number;
  totalWinPnl: number;
  totalLossPnl: number;
  netPnl: number;
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
  avgRR: number;
  tradesWithoutRR: number;
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

function toLocalDateStr(isoDate: string, timeZone: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "unknown";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${day}`;
}

function toLocalDayOfWeek(isoDate: string, timeZone: string): number {
  const d = new Date(isoDate);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

function toLocalHour(isoDate: string, timeZone: string): number {
  const d = new Date(isoDate);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")!.value);
}

export function computeTradeAnalytics(trades: JournalTradeRow[], timeZone?: string): TradeAnalytics {
  const tz = timeZone || "America/Sao_Paulo";
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

  // Real per-trade R/R — only trades with a stop-loss (and therefore a
  // computed risk_usd) contribute. Historical trades imported before the
  // migration and trades opened without an SL are excluded; we expose a
  // counter so the UI can explain gaps to the user.
  const tradesWithRR = sorted.filter(
    (t) => t.rr_realized != null && Number.isFinite(t.rr_realized)
  );
  const avgRR =
    tradesWithRR.length > 0
      ? tradesWithRR.reduce((s, t) => s + (t.rr_realized as number), 0) /
        tradesWithRR.length
      : 0;
  const tradesWithoutRR = totalTrades - tradesWithRR.length;

  const expectancy = totalTrades > 0 ? netPnl / totalTrades : 0;

  // ── Daily PnL ──
  const dailyMap = groupBy(sorted, (t) => toLocalDateStr(t.closed_at, tz));
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
  // FIX TECH-001: Equity curve starts from 0 cumulative P&L, so if early trades
  // are losses, peak stays at 0 and drawdown shows 0%. Instead, we track the
  // peak from the first equity value and handle all-negative curves properly.
  let peak = equityCurve.length > 0 ? equityCurve[0].equity : 0;
  let maxDrawdown = 0;
  const drawdownCurve: DrawdownPoint[] = equityCurve.map((pt) => {
    if (pt.equity > peak) peak = pt.equity;
    // Calculate drawdown as percentage decline from peak
    // If peak is positive, use it as the base. If peak <= 0 (all losses from start),
    // drawdown is 100% since we've never been above the starting point.
    let dd = 0;
    if (peak > 0) {
      dd = ((pt.equity - peak) / peak) * 100;
    } else if (pt.equity < 0) {
      // All values negative from start — drawdown relative to zero (starting point)
      dd = -100;
    }
    if (Math.abs(dd) > Math.abs(maxDrawdown)) maxDrawdown = dd;
    return { date: pt.date, drawdown: dd };
  });
  maxDrawdown = Math.abs(maxDrawdown);

  // ── Average equity (used by Sharpe, Sortino, Calmar) ──
  const avgEquity = equityCurve.length > 0
    ? equityCurve.reduce((s, p) => s + Math.abs(p.equity), 0) / equityCurve.length
    : 0;

  // ── Sharpe Ratio (annualized, need 20+ trading days) ──
  // FIX TECH-012: Subtract daily risk-free rate (~5% annual / 252 trading days)
  const ANNUAL_RISK_FREE_RATE = 0.05;
  const dailyRiskFreeRate = ANNUAL_RISK_FREE_RATE / 252;
  // Convert daily risk-free to same unit as meanDaily (USD) using avg equity
  const dailyRfUsd = avgEquity > 0 ? dailyRiskFreeRate * avgEquity : 0;
  const excessMeanDaily = meanDaily - dailyRfUsd;
  const sharpeRatio = tradingDays >= 20 && dailyStdDev > 0
    ? (excessMeanDaily / dailyStdDev) * Math.sqrt(252)
    : null;

  // ── Sortino Ratio (annualized, need 20+ trading days) ──
  // FIX TECH-012: Use excess returns (subtract risk-free rate) for Sortino as well
  const excessDailyPnls = dailyPnlValues.map((v) => v - dailyRfUsd);
  const downsidePnls = excessDailyPnls.filter((v) => v < 0);
  const downsideVariance = downsidePnls.length > 0
    ? downsidePnls.reduce((s, v) => s + v ** 2, 0) / tradingDays
    : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = tradingDays >= 20 && downsideStdDev > 0
    ? (excessMeanDaily / downsideStdDev) * Math.sqrt(252)
    : null;

  // ── Calmar Ratio ──
  // FIX TECH-004: Both annualized return and max drawdown must be in the same unit (%).
  // maxDrawdown is already in %, so convert netPnl to annualized return %.
  // We approximate annualized return as: (netPnl / tradingDays) * 252 days, expressed
  // as a % of the cumulative equity midpoint. Since we don't have starting balance here,
  // we use the ratio of annualized daily mean return % to maxDrawdown %.
  // Simplified: calmar = (meanDaily * 252) / maxDrawdown, where both are in % of equity.
  // Since meanDaily is in USD and maxDrawdown is in %, we normalize by dividing meanDaily
  // by the average equity to get a percentage, then annualize.
  const annualReturnPct = avgEquity > 0 && tradingDays > 0
    ? (meanDaily / avgEquity) * 252 * 100
    : 0;
  const calmarRatio = tradingDays >= 20 && maxDrawdown > 0 && avgEquity > 0
    ? annualReturnPct / maxDrawdown
    : null;

  // ── Kelly Criterion (half-Kelly, capped 0.5) ──
  const winProb = totalTrades > 0 ? wins.length / totalTrades : 0;
  const lossProb = 1 - winProb;
  const rawKelly = payoffRatio > 0 && lossProb > 0
    ? (winProb * payoffRatio - lossProb) / payoffRatio
    : 0;
  const kellyCriterion = Math.min(Math.max(rawKelly * 0.5, 0), 0.5);

  // ── Recovery Factor ──
  // FIX TECH-005: Recovery Factor = net profit / max drawdown, both in same unit (USD).
  // maxDrawdown is in %, so convert to USD using average equity as base.
  const maxDrawdownUsd = avgEquity > 0 ? (maxDrawdown / 100) * avgEquity : 0;
  const recoveryFactor = maxDrawdownUsd > 0 ? netPnl / maxDrawdownUsd : 0;

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
    groupBy(sorted, (t) => String(toLocalDayOfWeek(t.opened_at, tz))).entries()
  )
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([dayIdx, tds]) => {
      const dayWins = tds.filter((t) => getNetPnl(t) > 0);
      const dayLosses = tds.filter((t) => getNetPnl(t) <= 0);
      const totalWinPnl = dayWins.reduce((s, t) => s + getNetPnl(t), 0);
      const totalLossPnl = dayLosses.reduce((s, t) => s + getNetPnl(t), 0);
      return {
        day: DAY_NAMES[Number(dayIdx)],
        dayIndex: Number(dayIdx),
        tradeCount: tds.length,
        winRate: winRateOf(tds),
        avgPnl: totalPnlOf(tds) / tds.length,
        winCount: dayWins.length,
        lossCount: dayLosses.length,
        totalWinPnl,
        totalLossPnl,
        netPnl: totalWinPnl + totalLossPnl,
      };
    });

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
    groupBy(sorted, (t) => String(toLocalHour(t.opened_at, tz))).entries()
  )
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([hour, tds]) => {
      const hourWins = tds.filter((t) => getNetPnl(t) > 0);
      const hourLosses = tds.filter((t) => getNetPnl(t) <= 0);
      const totalWinPnl = hourWins.reduce((s, t) => s + getNetPnl(t), 0);
      const totalLossPnl = hourLosses.reduce((s, t) => s + getNetPnl(t), 0);
      return {
        hour: Number(hour),
        tradeCount: tds.length,
        winRate: winRateOf(tds),
        totalPnl: totalPnlOf(tds),
        winCount: hourWins.length,
        lossCount: hourLosses.length,
        totalWinPnl,
        totalLossPnl,
        netPnl: totalWinPnl + totalLossPnl,
      };
    });

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
    avgRR,
    tradesWithoutRR,
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
