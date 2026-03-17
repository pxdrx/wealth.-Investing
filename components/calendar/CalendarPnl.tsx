"use client";

import { useMemo, useState } from "react";
import type { CalendarPnlProps, DayData } from "./types";
import { aggregateByDay, formatPnl } from "./utils";
import { CalendarGrid } from "./CalendarGrid";
import { DayDetailPanel } from "./DayDetailPanel";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function CalendarPnl({
  trades,
  accounts,
  dayNotes,
  showConsolidatedToggle,
  showWindowChrome,
}: CalendarPnlProps) {
  const now = new Date();
  const [displayYear, setDisplayYear] = useState(now.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dailyData = useMemo(
    () => aggregateByDay(trades, accounts),
    [trades, accounts]
  );

  // Compute month stats filtered to displayMonth
  const monthStats = useMemo(() => {
    const prefix = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}`;
    let totalPnl = 0;
    let totalTrades = 0;
    let totalWins = 0;
    let daysOperated = 0;

    dailyData.forEach((day: DayData) => {
      if (day.date.startsWith(prefix)) {
        totalPnl += day.totalPnl;
        totalTrades += day.tradeCount;
        totalWins += day.wins;
        daysOperated += 1;
      }
    });

    const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0;
    return { totalPnl, totalTrades, winRate, daysOperated };
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

  const pnlColor = (value: number) =>
    value > 0
      ? "hsl(var(--landing-accent))"
      : value < 0
        ? "hsl(var(--landing-accent-danger))"
        : "hsl(var(--landing-text-muted))";

  const title = showConsolidatedToggle ? "Consolidado de Contas" : "Calendario P&L";

  const selectedDayData = selectedDate ? dailyData.get(selectedDate) ?? null : null;
  const selectedDayNote = selectedDate && dayNotes ? dayNotes[selectedDate] ?? null : null;

  const kpis = [
    {
      label: "P&L MÊS",
      value: formatPnl(monthStats.totalPnl),
      color: pnlColor(monthStats.totalPnl),
    },
    {
      label: "WIN RATE",
      value: `${monthStats.winRate}%`,
      color: "hsl(var(--landing-text))",
    },
    {
      label: "TRADES",
      value: monthStats.totalTrades.toString(),
      color: "hsl(var(--landing-text))",
    },
    {
      label: "DIAS OPERADOS",
      value: monthStats.daysOperated.toString(),
      color: "hsl(var(--landing-text))",
    },
  ];

  return (
    <div className="landing-card overflow-hidden">
      {/* Window chrome */}
      {showWindowChrome && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b"
          style={{ borderColor: "hsl(var(--landing-border))" }}
        >
          <div className="flex gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "hsl(0 70% 55% / 0.5)" }}
            />
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "hsl(42 80% 55% / 0.5)" }}
            />
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "hsl(220 70% 55% / 0.4)" }}
            />
          </div>
          <span
            className="ml-2"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "10px",
              color: "hsl(var(--landing-text-muted))",
            }}
          >
            wealth.Investing — {showConsolidatedToggle ? "Dashboard" : "Journal"}
          </span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="px-4 md:px-5 pt-4 md:pt-5 pb-3">
        <div className="flex items-baseline justify-between mb-3">
          <h3
            className="font-semibold"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "13px",
              color: "hsl(var(--landing-text))",
            }}
          >
            {title}
          </h3>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "10px",
              color: "hsl(var(--landing-text-muted))",
            }}
          >
            {MONTH_NAMES[displayMonth]} {displayYear}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg px-3 py-2.5"
              style={{
                backgroundColor: "hsl(var(--landing-bg-tertiary))",
              }}
            >
              <p
                className="uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "8px",
                  letterSpacing: "0.05em",
                  color: "hsl(var(--landing-text-muted))",
                }}
              >
                {kpi.label}
              </p>
              <p
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  color: kpi.color,
                }}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar + Detail Panel */}
      <div
        className="flex flex-col lg:flex-row border-t"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <div className="flex-1 p-4 md:p-5">
          <CalendarGrid
            year={displayYear}
            month={displayMonth}
            dailyData={dailyData}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            monthPnl={monthStats.totalPnl}
          />
        </div>

        <DayDetailPanel
          selectedDate={selectedDate}
          dayData={selectedDayData}
          dayNote={selectedDayNote}
          showConsolidatedToggle={showConsolidatedToggle}
        />
      </div>
    </div>
  );
}
