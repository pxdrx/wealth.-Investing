import type { DayData, TradeRow } from "./types";
import { toForexDateKey } from "@/lib/trading/forex-day";

/**
 * Converts an ISO timestamp to a broker-day YYYY-MM-DD key.
 * Broker day starts at 22:00 UTC (5pm ET forex close / midnight MT5 server).
 * A trade at 23:00 UTC Monday = Tuesday's broker day.
 * A trade at 21:59 UTC Monday = Monday's broker day.
 */
export function toLocalDateKey(iso: string): string {
  return toForexDateKey(iso);
}

/**
 * Groups trades by date (local timezone YYYY-MM-DD) and computes
 * pnl / trades / wins / losses / best / worst per day.
 * When `accounts` is provided, also builds the byAccount breakdown.
 */
export function aggregateByDay(
  trades: TradeRow[],
  accounts?: { id: string; name: string }[]
): Map<string, DayData> {
  const accountMap = new Map<string, string>();
  if (accounts) {
    for (const a of accounts) {
      accountMap.set(a.id, a.name);
    }
  }

  const map = new Map<string, DayData>();

  for (const t of trades) {
    // Use closed_at for P&L calendar (profit is realized on close, not open)
    const dateKey = toLocalDateKey(t.closed_at || t.opened_at);
    const pnl = t.net_pnl_usd;

    let day = map.get(dateKey);
    if (!day) {
      day = {
        date: dateKey,
        totalPnl: 0,
        tradeCount: 0,
        wins: 0,
        losses: 0,
        bestTrade: -Infinity,
        worstTrade: Infinity,
        totalWinAmount: 0,
        totalLossAmount: 0,
      };
      if (accounts) {
        day.byAccount = {};
      }
      map.set(dateKey, day);
    }

    day.totalPnl += pnl;
    day.tradeCount += 1;
    if (pnl > 0) { day.wins += 1; day.totalWinAmount += pnl; }
    if (pnl < 0) { day.losses += 1; day.totalLossAmount += Math.abs(pnl); }
    if (pnl > day.bestTrade) day.bestTrade = pnl;
    if (pnl < day.worstTrade) day.worstTrade = pnl;

    if (day.byAccount) {
      const accId = t.account_id;
      if (!day.byAccount[accId]) {
        day.byAccount[accId] = {
          accountName: accountMap.get(accId) ?? accId,
          pnl: 0,
          trades: 0,
        };
      }
      day.byAccount[accId].pnl += pnl;
      day.byAccount[accId].trades += 1;
    }
  }

  // Fix sentinel values for days where no trades adjusted best/worst
  Array.from(map.values()).forEach((day) => {
    if (day.bestTrade === -Infinity) day.bestTrade = 0;
    if (day.worstTrade === Infinity) day.worstTrade = 0;
  });

  return map;
}

/**
 * Cell background color matching JournalMockup.tsx palette.
 * Uses landing-page CSS variables so it works in both light and dark mode.
 */
export function cellColor(pnl: number | null): string {
  if (pnl === null) return "transparent";
  if (pnl > 0) return "hsl(var(--pnl-cell-win))";
  if (pnl === 0) return "hsl(var(--border))";
  return "hsl(var(--pnl-cell-loss))";
}

/**
 * Calculates the current streak of consecutive winning or losing *trading* days.
 * Days are sorted newest-first; streak starts from the most recent day.
 */
export function calculateStreak(
  dailyData: Map<string, DayData>
): { count: number; type: "W" | "L" } {
  const sorted = Array.from(dailyData.values()).sort(
    (a, b) => b.date.localeCompare(a.date) // newest first
  );

  if (sorted.length === 0) return { count: 0, type: "W" };

  const firstType: "W" | "L" = sorted[0].totalPnl >= 0 ? "W" : "L";
  let count = 0;

  for (const day of sorted) {
    const dayType: "W" | "L" = day.totalPnl >= 0 ? "W" : "L";
    if (dayType !== firstType) break;
    count += 1;
  }

  return { count, type: firstType };
}

/**
 * Compact USD format with sign: +$520, -$1.2k, $0
 */
export function formatPnl(value: number): string {
  const abs = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";

  if (abs === 0) return "$0";
  if (abs >= 1000) {
    const k = abs / 1000;
    // Show one decimal only if it's not .0
    const formatted = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
    return `${sign}$${formatted}k`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Returns the first weekday (0=Sun) and total days for a given month.
 */
export function getMonthDays(
  year: number,
  month: number
): { firstDay: number; daysInMonth: number } {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

export interface GridCell {
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
}

/**
 * Returns a 42-cell (6 rows x 7 cols) Monday-first grid for the given month.
 * Includes trailing days from previous month and leading days from next month.
 */
export function getMonthGrid(year: number, month: number): GridCell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // 0=Sun → convert to Monday-first: Mon=0, Tue=1, ..., Sun=6
  const firstDaySun = new Date(year, month, 1).getDay();
  const firstDayMon = firstDaySun === 0 ? 6 : firstDaySun - 1;

  const cells: GridCell[] = [];

  // Previous month trailing days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  for (let i = firstDayMon - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, month: prevMonth, year: prevYear, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true });
  }

  // Next month leading days to fill to 42 cells (or fewer if 35 is enough)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const totalRows = cells.length <= 35 ? 35 : 42;
  let nextDay = 1;
  while (cells.length < totalRows) {
    cells.push({ day: nextDay++, month: nextMonth, year: nextYear, isCurrentMonth: false });
  }

  return cells;
}
