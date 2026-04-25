"use client";

import { useMemo, useState } from "react";
import type { CalendarPnlProps, DayData, TradeRow } from "./types";
import { aggregateByDay, formatPnl, toLocalDateKey } from "./utils";
import { CalendarGrid } from "./CalendarGrid";
import { DayDetailModal } from "@/components/journal/DayDetailModal";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { cn } from "@/lib/utils";
import { computeTradeAnalytics } from "@/lib/trade-analytics";
import type { JournalTradeRow } from "@/components/journal/types";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function CalendarPnl({
  trades,
  accounts,
  dayNotes,
  userId,
  accountId,
  accountIds,
  defaultReadOnly,
  onNoteSaved,
  onTradeDeleted,
  title: customTitle,
  compact,
}: CalendarPnlProps) {
  const now = new Date();
  const [displayYear, setDisplayYear] = useState(now.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterSymbol, setFilterSymbol] = useState<string | null>(null);

  // Extract unique symbols from trades for filter pills
  const symbols = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => { if (t.symbol) set.add(t.symbol); });
    return Array.from(set).sort();
  }, [trades]);

  // Filter trades by selected symbol
  const filteredTrades = useMemo(
    () => filterSymbol ? trades.filter((t) => t.symbol === filterSymbol) : trades,
    [trades, filterSymbol]
  );

  const dailyData = useMemo(
    () => aggregateByDay(filteredTrades, accounts),
    [filteredTrades, accounts]
  );

  // Compute set of dates that have trades with notes
  const hasTradeNotes = useMemo(() => {
    const set = new Set<string>();
    for (const t of filteredTrades) {
      if ("notes" in t && t.notes) {
        set.add(toLocalDateKey(t.opened_at));
      }
    }
    return set;
  }, [filteredTrades]);

  // Raw trades that fall within the currently displayed month.
  // Uses `closed_at` when available (true per-trade RR uses close time),
  // falls back to `opened_at` for rows that don't carry a close timestamp.
  const monthTrades = useMemo<TradeRow[]>(() => {
    const prefix = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}`;
    return filteredTrades.filter((t) => {
      const ref = t.closed_at ?? t.opened_at;
      return typeof ref === "string" && ref.startsWith(prefix);
    });
  }, [filteredTrades, displayYear, displayMonth]);

  // Compute month stats filtered to displayMonth
  const monthStats = useMemo(() => {
    let totalPnl = 0;
    let totalTrades = 0;
    let totalWins = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;
    let totalLosses = 0;
    let daysOperated = 0;

    const prefix = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}`;
    dailyData.forEach((day: DayData) => {
      if (day.date.startsWith(prefix)) {
        totalPnl += day.totalPnl;
        totalTrades += day.tradeCount;
        totalWins += day.wins;
        totalLosses += day.losses;
        totalWinAmount += day.totalWinAmount;
        totalLossAmount += day.totalLossAmount;
        daysOperated += 1;
      }
    });

    // True per-trade RR from computeTradeAnalytics (payoff removed).
    // Adapt TradeRow → JournalTradeRow shape for the analytics helper —
    // only `rr_realized`, `closed_at`, `opened_at`, `pnl_usd`, `net_pnl_usd`,
    // `symbol` and `direction` are needed; missing fields get safe defaults.
    const adapted: JournalTradeRow[] = monthTrades.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      direction: t.direction,
      opened_at: t.opened_at,
      closed_at: t.closed_at ?? t.opened_at,
      pnl_usd: t.net_pnl_usd,
      fees_usd: 0,
      net_pnl_usd: t.net_pnl_usd,
      category: null,
      rr_realized: t.rr_realized ?? null,
    }));
    const analytics = computeTradeAnalytics(adapted);
    const avgRR = analytics.avgRR;
    const tradesWithoutRR = analytics.tradesWithoutRR;

    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : (totalWinAmount > 0 ? Infinity : 0);
    return {
      totalPnl,
      totalTrades,
      avgRR,
      tradesWithoutRR,
      daysOperated,
      totalWins,
      totalLosses,
      winRate,
      profitFactor,
    };
  }, [dailyData, displayYear, displayMonth, monthTrades]);

  const handlePrevMonth = () => {
    setSelectedDate(null);
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear((y) => y - 1);
    } else {
      setDisplayMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDate(null);
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear((y) => y + 1);
    } else {
      setDisplayMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (date: string) => {
    // Only open modal if the day has trades
    if (!dailyData.has(date)) return;
    setSelectedDate(date);
    setModalOpen(true);
  };

  const pnlColor = (value: number) =>
    value > 0
      ? "hsl(var(--pnl-positive))"
      : value < 0
        ? "hsl(var(--pnl-negative))"
        : "hsl(var(--muted-foreground))";

  const { mask } = usePrivacy();
  const title = customTitle ?? (accounts ? "Consolidado de Contas" : "Calendário P&L");

  const winRateColor = monthStats.winRate >= 50
    ? "hsl(var(--pnl-positive))"
    : monthStats.winRate > 0
      ? "hsl(var(--pnl-negative))"
      : "hsl(var(--muted-foreground))";

  const kpis = [
    {
      label: "P&L MÊS",
      value: formatPnl(monthStats.totalPnl),
      color: pnlColor(monthStats.totalPnl),
    },
    {
      label: "WIN RATE",
      value: monthStats.totalTrades > 0 ? `${monthStats.winRate.toFixed(1)}%` : "—",
      color: winRateColor,
    },
    {
      label: "PROFIT FACTOR",
      value: monthStats.profitFactor === Infinity ? "∞" : monthStats.profitFactor > 0 ? monthStats.profitFactor.toFixed(2) : "—",
      color: monthStats.profitFactor >= 1 ? "hsl(var(--pnl-positive))" : monthStats.profitFactor > 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--muted-foreground))",
    },
    {
      label: "RR MÉDIO",
      value:
        monthStats.totalTrades > 0 && monthStats.tradesWithoutRR === monthStats.totalTrades
          ? "—"
          : monthStats.avgRR > 0
            ? monthStats.avgRR.toFixed(2)
            : "—",
      color: "hsl(var(--foreground))",
    },
    {
      label: "TRADES",
      value: monthStats.totalTrades > 0 ? `${monthStats.totalWins}W / ${monthStats.totalLosses}L` : "0",
      color: "hsl(var(--foreground))",
    },
    {
      label: "DIAS OPERADOS",
      value: monthStats.daysOperated.toString(),
      color: "hsl(var(--foreground))",
    },
  ];

  return (
    <div className={cn("landing-card overflow-hidden", compact && "border-0 shadow-none")}>
      {/* KPI Strip — hidden in compact mode */}
      {!compact && (
        <div className="px-4 md:px-5 pt-4 md:pt-5 pb-3">
          <div className="flex items-baseline justify-between mb-3">
            <h3
              className="text-sm font-semibold tracking-tight"
              style={{ color: "hsl(var(--foreground))" }}
            >
              {title}
            </h3>
            <span
              className="text-[11px] text-muted-foreground"
            >
              {MONTH_NAMES[displayMonth]} {displayYear}
            </span>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg px-3 py-2.5"
                style={{
                  backgroundColor: "hsl(var(--secondary))",
                }}
              >
                <p
                  className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground"
                >
                  {kpi.label}
                </p>
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: kpi.color }}
                >
                  {mask(kpi.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Symbol filter pills */}
          {symbols.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <button
                onClick={() => setFilterSymbol(null)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                  !filterSymbol
                    ? "bg-foreground text-background border-foreground"
                    : "border-border/60 text-muted-foreground hover:border-foreground/40"
                )}
              >
                Todos
              </button>
              {symbols.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterSymbol(filterSymbol === s ? null : s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                    filterSymbol === s
                      ? "bg-foreground text-background border-foreground"
                      : "border-border/60 text-muted-foreground hover:border-foreground/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compact header + KPIs */}
      {compact && (
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-xs font-semibold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>{title}</h3>
            <span className="text-[10px] text-muted-foreground">{MONTH_NAMES[displayMonth]} {displayYear}</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg px-2 py-1.5"
                style={{ backgroundColor: "hsl(var(--secondary))" }}
              >
                <p className="text-[8px] uppercase tracking-wider mb-0.5 text-muted-foreground">{kpi.label}</p>
                <p className="text-[11px] font-semibold tabular-nums" style={{ color: kpi.color }}>{mask(kpi.value)}</p>
              </div>
            ))}
          </div>

          {/* Symbol filter pills (compact) */}
          {symbols.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={() => setFilterSymbol(null)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all border",
                  !filterSymbol
                    ? "bg-foreground text-background border-foreground"
                    : "border-border/60 text-muted-foreground hover:border-foreground/40"
                )}
              >
                Todos
              </button>
              {symbols.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterSymbol(filterSymbol === s ? null : s)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium transition-all border",
                    filterSymbol === s
                      ? "bg-foreground text-background border-foreground"
                      : "border-border/60 text-muted-foreground hover:border-foreground/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar — full width, no sidebar */}
      <div
        className={cn(!compact && "border-t")}
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className={cn(compact ? "p-1" : "p-4 md:p-5")}>
          <CalendarGrid
            year={displayYear}
            month={displayMonth}
            dailyData={dailyData}
            dayNotes={dayNotes}
            hasTradeNotes={hasTradeNotes}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            monthPnl={monthStats.totalPnl}
          />
        </div>
      </div>

      {/* Day detail popup */}
      <DayDetailModal
        date={selectedDate}
        userId={userId ?? null}
        accountId={accountId}
        accountIds={accountIds}
        defaultReadOnly={defaultReadOnly}
        filterSymbol={filterSymbol}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onTradeDeleted={onTradeDeleted}
        onNoteSaved={() => {
          // Refresh day notes in parent by calling onNoteSaved
          if (selectedDate && onNoteSaved) {
            // Re-fetch the updated note
            onNoteSaved(selectedDate, { observation: "", tags: null });
          }
        }}
      />
    </div>
  );
}
