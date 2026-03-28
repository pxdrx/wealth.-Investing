"use client";

import { useMemo, useState } from "react";
import type { CalendarPnlProps, DayData } from "./types";
import { aggregateByDay, formatPnl } from "./utils";
import { CalendarGrid } from "./CalendarGrid";
import { DayDetailModal } from "@/components/journal/DayDetailModal";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { cn } from "@/lib/utils";

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
  onNoteSaved,
  title: customTitle,
  compact,
}: CalendarPnlProps) {
  const now = new Date();
  const [displayYear, setDisplayYear] = useState(now.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const dailyData = useMemo(
    () => aggregateByDay(trades, accounts),
    [trades, accounts]
  );

  // Compute set of dates that have trades with notes
  const hasTradeNotes = useMemo(() => {
    const set = new Set<string>();
    for (const t of trades) {
      if ("notes" in t && t.notes) {
        const dateKey = t.opened_at.slice(0, 10);
        set.add(dateKey);
      }
    }
    return set;
  }, [trades]);

  // Compute month stats filtered to displayMonth
  const monthStats = useMemo(() => {
    const prefix = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}`;
    let totalPnl = 0;
    let totalTrades = 0;
    let totalWins = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;
    let totalLosses = 0;
    let daysOperated = 0;

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

    const avgWin = totalWins > 0 ? totalWinAmount / totalWins : 0;
    const avgLoss = totalLosses > 0 ? totalLossAmount / totalLosses : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? Infinity : 0);
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : (totalWinAmount > 0 ? Infinity : 0);
    return { totalPnl, totalTrades, avgRR, daysOperated, totalWins, totalLosses, winRate, profitFactor };
  }, [dailyData, displayYear, displayMonth]);

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
    setSelectedDate(date);
    setModalOpen(true);
  };

  const pnlColor = (value: number) =>
    value > 0
      ? "hsl(var(--pnl-positive))"
      : value < 0
        ? "hsl(var(--pnl-negative))"
        : "hsl(var(--landing-text-muted))";

  const { mask } = usePrivacy();
  const title = customTitle ?? (accounts ? "Consolidado de Contas" : "Calendário P&L");

  const winRateColor = monthStats.winRate >= 50
    ? "hsl(var(--pnl-positive))"
    : monthStats.winRate > 0
      ? "hsl(var(--pnl-negative))"
      : "hsl(var(--landing-text-muted))";

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
      color: monthStats.profitFactor >= 1 ? "hsl(var(--pnl-positive))" : monthStats.profitFactor > 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))",
    },
    {
      label: "RR MÉDIO",
      value: monthStats.avgRR === Infinity ? "∞" : monthStats.avgRR > 0 ? monthStats.avgRR.toFixed(2) : "0",
      color: "hsl(var(--landing-text))",
    },
    {
      label: "TRADES",
      value: monthStats.totalTrades > 0 ? `${monthStats.totalWins}W / ${monthStats.totalLosses}L` : "0",
      color: "hsl(var(--landing-text))",
    },
    {
      label: "DIAS OPERADOS",
      value: monthStats.daysOperated.toString(),
      color: "hsl(var(--landing-text))",
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
              style={{ color: "hsl(var(--landing-text))" }}
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
                  backgroundColor: "hsl(var(--landing-bg-tertiary))",
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
        </div>
      )}

      {/* Compact header */}
      {compact && (
        <div className="px-3 pt-3 pb-2 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold tracking-tight" style={{ color: "hsl(var(--landing-text))" }}>{title}</h3>
          <span className="text-[10px] text-muted-foreground">{MONTH_NAMES[displayMonth]} {displayYear}</span>
        </div>
      )}

      {/* Calendar — full width, no sidebar */}
      <div
        className={cn(!compact && "border-t")}
        style={{ borderColor: "hsl(var(--landing-border))" }}
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
        open={modalOpen}
        onOpenChange={setModalOpen}
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
