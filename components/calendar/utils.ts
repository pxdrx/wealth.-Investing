import type { DayData, TradeRow } from "./types";

/**
 * Groups trades by date (YYYY-MM-DD from opened_at) and computes
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
    const dateKey = t.opened_at.slice(0, 10); // YYYY-MM-DD
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
      };
      if (accounts) {
        day.byAccount = {};
      }
      map.set(dateKey, day);
    }

    day.totalPnl += pnl;
    day.tradeCount += 1;
    if (pnl > 0) day.wins += 1;
    if (pnl < 0) day.losses += 1;
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
  if (pnl > 400) return "hsl(var(--landing-accent) / 0.7)";
  if (pnl > 0) return "hsl(var(--landing-accent) / 0.35)";
  if (pnl === 0) return "hsl(var(--landing-border))";
  return "hsl(var(--landing-accent-danger) / 0.4)";
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
