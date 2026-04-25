"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { toForexDateKey, forexMonthBoundsUtc } from "@/lib/trading/forex-day";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";
import type { AppMessageKey } from "@/lib/i18n/app";

interface PnlCalendarProps {
  accountId: string | null;
  allAccounts?: boolean;
  userId?: string | null;
  onDayClick?: (date: string, dayData: DayData) => void;
  refreshKey?: number;
}

export interface DayData {
  pnl: number;
  trades: number;
  avgRr: number | null;
}

interface TradeRow {
  opened_at: string | null;
  net_pnl_usd: number | null;
  pnl_usd: number | null;
  fees_usd: number | null;
}

const MONTH_KEYS: AppMessageKey[] = [
  "pnlCalendar.month.1", "pnlCalendar.month.2", "pnlCalendar.month.3",
  "pnlCalendar.month.4", "pnlCalendar.month.5", "pnlCalendar.month.6",
  "pnlCalendar.month.7", "pnlCalendar.month.8", "pnlCalendar.month.9",
  "pnlCalendar.month.10", "pnlCalendar.month.11", "pnlCalendar.month.12",
];

const DAY_KEYS: AppMessageKey[] = [
  "pnlCalendar.day.sun", "pnlCalendar.day.mon", "pnlCalendar.day.tue",
  "pnlCalendar.day.wed", "pnlCalendar.day.thu", "pnlCalendar.day.fri",
  "pnlCalendar.day.sat",
];

function getNet(r: TradeRow): number {
  if (typeof r.net_pnl_usd === "number" && !Number.isNaN(r.net_pnl_usd)) return r.net_pnl_usd;
  return (r.pnl_usd ?? 0) + (r.fees_usd ?? 0);
}

export function PnlCalendar({ accountId, allAccounts = false, userId, onDayClick, refreshKey = 0 }: PnlCalendarProps) {
  const t = useAppT();
  const MONTH_NAMES = useMemo(() => MONTH_KEYS.map((k) => t(k)), [t]);
  const DAY_HEADERS = useMemo(() => DAY_KEYS.map((k) => t(k)), [t]);
  const now = new Date();
  const [displayMonth, setDisplayMonth] = useState(now.getMonth());
  const [displayYear, setDisplayYear] = useState(now.getFullYear());
  const [rawTrades, setRawTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteDates, setNoteDates] = useState<Set<string>>(new Set());

  // Fetch trades
  useEffect(() => {
    if (allAccounts) {
      if (!userId) { setRawTrades([]); return; }
    } else {
      if (!accountId) { setRawTrades([]); return; }
    }

    setLoading(true);
    // Use forex-day-aware bounds so trades near day boundaries (e.g. opened
    // after 17:00 ET) are fetched in the same month the indicator groups them.
    const { startUtc: startIso, endUtc: endIso } = forexMonthBoundsUtc(displayYear, displayMonth);

    let cancelled = false;
    (async () => {
      try {
        let query = supabase
          .from("journal_trades")
          .select("opened_at, net_pnl_usd, pnl_usd, fees_usd")
          .gte("opened_at", startIso)
          .lt("opened_at", endIso);

        if (allAccounts) {
          query = query.eq("user_id", userId as string);
        } else {
          query = query.eq("account_id", accountId as string);
        }

        const { data, error } = await query;
        if (cancelled) return;
        if (error) { setRawTrades([]); return; }
        setRawTrades((data ?? []) as TradeRow[]);
      } catch {
        if (!cancelled) setRawTrades([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accountId, allAccounts, userId, displayMonth, displayYear]);

  // Fetch day notes for blue dot indicators
  useEffect(() => {
    const uid = userId;
    if (!uid) return;

    let cancelled = false;
    const startDate = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-01`;
    const endDate = displayMonth === 11
      ? `${displayYear + 1}-01-01`
      : `${displayYear}-${String(displayMonth + 2).padStart(2, "0")}-01`;

    (async () => {
      try {
        let q = supabase
          .from("day_notes")
          .select("date")
          .eq("user_id", uid)
          .gte("date", startDate)
          .lt("date", endDate);
        if (accountId) q = q.eq("account_id", accountId);
        const { data } = await q;

        if (cancelled) return;
        const dates = new Set<string>();
        for (const row of data ?? []) {
          dates.add((row as { date: string }).date);
        }
        setNoteDates(dates);
      } catch (err) {
        console.warn("[PnlCalendar] Failed to fetch day_notes — table may not exist yet:", err);
        if (!cancelled) setNoteDates(new Set());
      }
    })();
    return () => { cancelled = true; };
  }, [userId, displayMonth, displayYear, refreshKey]);

  // Aggregate by day
  const dailyData = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number; wins: number; losses: number }> = {};
    for (const row of rawTrades) {
      if (!row.opened_at) continue;
      const key = toForexDateKey(row.opened_at);
      if (!map[key]) map[key] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
      const net = getNet(row);
      map[key].pnl += net;
      map[key].trades += 1;
      if (net > 0) map[key].wins += 1;
      else if (net < 0) map[key].losses += 1;
    }
    return map;
  }, [rawTrades]);

  // Build calendar grid
  const { weeks, monthStats } = useMemo(() => {
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(displayYear, displayMonth, 1).getDay();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const weeksArr: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeksArr.push(cells.slice(i, i + 7));
    }

    let totalPnl = 0, totalTrades = 0, totalWins = 0, totalLosses = 0, tradingDays = 0;
    for (const v of Object.values(dailyData)) {
      totalPnl += v.pnl;
      totalTrades += v.trades;
      totalWins += v.wins;
      totalLosses += v.losses;
      tradingDays += 1;
    }

    return {
      weeks: weeksArr,
      monthStats: { totalPnl, totalTrades, totalWins, totalLosses, tradingDays },
    };
  }, [displayMonth, displayYear, dailyData]);

  // Weekly summaries
  const weeklySummaries = useMemo(() => {
    return weeks.map((week, wi) => {
      let pnl = 0, days = 0, trades = 0;
      for (const day of week) {
        if (day === null) continue;
        const key = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dd = dailyData[key];
        if (dd) { pnl += dd.pnl; days += 1; trades += dd.trades; }
      }
      // Weekly summary label kept locale-neutral ("S1"/"S2"/...) so it works in
      // both PT (Semana 1) and EN (Week 1) without a per-row t() call.
      return { label: `S${wi + 1}`, pnl, days, trades };
    });
  }, [weeks, dailyData, displayMonth, displayYear]);

  const goPrev = () => {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear((y) => y - 1); }
    else setDisplayMonth((m) => m - 1);
  };
  const goNext = () => {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear((y) => y + 1); }
    else setDisplayMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    const key = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dd = dailyData[key];
    onDayClick?.(key, dd ? { pnl: dd.pnl, trades: dd.trades, avgRr: null } : { pnl: 0, trades: 0, avgRr: null });
  };

  const monthTitle = t("pnlCalendar.monthLabel")
    .replace("{month}", MONTH_NAMES[displayMonth])
    .replace("{year}", String(displayYear));

  const formatPnl = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000) return `${v > 0 ? "+" : "-"}$${(abs / 1000).toFixed(1)}k`;
    return `${v > 0 ? "+" : "-"}$${abs.toFixed(0)}`;
  };

  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-0">
        {/* Month summary bar */}
        <div className="px-5 pt-5 pb-4" style={{ backgroundColor: "hsl(var(--card))" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{t("pnlCalendar.title")}</h3>
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              monthStats.totalPnl >= 0
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 text-red-600 dark:text-red-400"
            )}>
              {monthStats.totalPnl >= 0 ? t("pnlCalendar.positive") : t("pnlCalendar.negative")}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: t("pnlCalendar.kpi.operations"), value: String(monthStats.totalTrades) },
              { label: t("pnlCalendar.kpi.winRate"), value: monthStats.totalTrades > 0 ? `${((monthStats.totalWins / monthStats.totalTrades) * 100).toFixed(0)}%` : "—" },
              {
                label: t("pnlCalendar.kpi.totalResult"),
                value: monthStats.totalPnl !== 0 ? `$ ${Math.abs(monthStats.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—",
                color: monthStats.totalPnl > 0 ? "text-emerald-600 dark:text-emerald-400" : monthStats.totalPnl < 0 ? "text-red-600 dark:text-red-400" : undefined,
              },
              { label: t("pnlCalendar.kpi.tradingDays"), value: String(monthStats.tradingDays) },
              {
                label: t("pnlCalendar.kpi.avgPerOp"),
                value: monthStats.totalTrades > 0
                  ? `$ ${Math.abs(monthStats.totalPnl / monthStats.totalTrades).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—",
                color: monthStats.totalTrades > 0
                  ? (monthStats.totalPnl / monthStats.totalTrades) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                  : undefined,
              },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-border/40 px-3 py-2.5" style={{ backgroundColor: "hsl(var(--muted) / 0.15)" }}>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <p className={cn("text-lg font-bold mt-0.5", kpi.color ?? "text-foreground")}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-5 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("pnlCalendar.legend.wins")}: {monthStats.totalWins}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> {t("pnlCalendar.legend.losses")}: {monthStats.totalLosses}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600" /> {t("pnlCalendar.legend.be")}: {monthStats.totalTrades - monthStats.totalWins - monthStats.totalLosses}
            </span>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="px-5 pb-5 pt-3" style={{ backgroundColor: "hsl(var(--card))" }}>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goPrev} aria-label={t("pnlCalendar.prevMonth")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-bold tracking-tight text-foreground">{monthTitle}</h2>
              <div className="mx-auto mt-1 h-[2px] w-8 rounded-full bg-blue-500" />
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goNext} aria-label={t("pnlCalendar.nextMonth")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {loading && (
            <div className="grid grid-cols-8 gap-1">
              {DAY_HEADERS.map((h) => (
                <div key={h} className="text-center text-[10px] font-semibold text-muted-foreground py-1.5">{h}</div>
              ))}
              <div className="text-center text-[10px] font-semibold text-muted-foreground py-1.5">{t("pnlCalendar.summaryHeader")}</div>
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={`skel-${i}`} className="h-[72px] rounded-md bg-muted/20 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-8 gap-[3px]">
              {DAY_HEADERS.map((h) => (
                <div key={h} className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground py-1.5">
                  {h}
                </div>
              ))}
              <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground py-1.5">
                {t("pnlCalendar.summaryHeader")}
              </div>

              {weeks.map((week, wi) => (
                <Fragment key={`week-${wi}`}>
                  {week.map((day, di) => {
                    if (day === null) {
                      return <div key={`empty-${wi}-${di}`} className="min-h-[72px]" />;
                    }
                    const key = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dd = dailyData[key];
                    const hasTrades = dd && dd.trades > 0;
                    const pnl = dd?.pnl ?? 0;
                    const isProfit = pnl > 0;
                    const isLoss = pnl < 0;
                    const hasNote = noteDates.has(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "relative min-h-[72px] rounded-md p-1.5 text-left transition-all duration-150",
                          "hover:ring-1 hover:ring-blue-500/50 hover:brightness-110",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                          hasTrades && isProfit && "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50",
                          hasTrades && isLoss && "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50",
                          hasTrades && !isProfit && !isLoss && "bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700/50",
                          !hasTrades && "border border-transparent hover:border-border/40",
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className={cn(
                            "text-[10px] font-medium",
                            hasTrades ? "text-foreground/70" : "text-muted-foreground/50"
                          )}>{day}</span>
                          {hasNote && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-0.5" />
                          )}
                        </div>
                        {hasTrades && (
                          <div className="mt-0.5">
                            <p className={cn(
                              "text-[12px] font-bold leading-tight",
                              isProfit && "text-emerald-700 dark:text-emerald-400",
                              isLoss && "text-red-700 dark:text-red-400",
                              !isProfit && !isLoss && "text-foreground",
                            )}>
                              {formatPnl(pnl)}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {dd.trades} {dd.trades !== 1 ? t("pnlCalendar.tradesShortPlural") : t("pnlCalendar.tradesShort")}
                            </p>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Weekly summary */}
                  <div
                    key={`summary-${wi}`}
                    className="min-h-[72px] rounded-md border border-border/20 p-1.5 flex flex-col justify-center"
                    style={{ backgroundColor: "hsl(var(--muted) / 0.08)" }}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        weeklySummaries[wi].pnl > 0 ? "bg-emerald-500" : weeklySummaries[wi].pnl < 0 ? "bg-red-500" : "bg-zinc-400"
                      )} />
                      <span className="text-[10px] font-semibold text-muted-foreground">{weeklySummaries[wi].label}</span>
                    </div>
                    <p className={cn(
                      "text-[12px] font-bold",
                      weeklySummaries[wi].pnl > 0 ? "text-emerald-700 dark:text-emerald-400"
                      : weeklySummaries[wi].pnl < 0 ? "text-red-700 dark:text-red-400"
                      : "text-muted-foreground"
                    )}>
                      {weeklySummaries[wi].trades > 0
                        ? `$ ${Math.abs(weeklySummaries[wi].pnl).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        : "—"}
                    </p>
                    {weeklySummaries[wi].trades > 0 && (
                      <p className="text-[9px] text-muted-foreground">
                        {weeklySummaries[wi].days}d · {weeklySummaries[wi].trades} {t("pnlCalendar.opsShort")}
                      </p>
                    )}
                  </div>
                </Fragment>
              ))}
            </div>
          )}

          {!loading && !allAccounts && !accountId && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("pnlCalendar.selectAccount")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
