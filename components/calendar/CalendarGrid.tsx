"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayData, DayNote } from "./types";
import { cellColor, formatPnl, getMonthDays } from "./utils";
import { usePrivacy } from "@/components/context/PrivacyContext";

interface CalendarGridProps {
  year: number;
  month: number;
  dailyData: Map<string, DayData>;
  dayNotes?: Record<string, DayNote>;
  hasTradeNotes?: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  monthPnl: number;
}

const DAY_HEADERS = ["D", "S", "T", "Q", "Q", "S", "S"];

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function CalendarGrid({
  year,
  month,
  dailyData,
  dayNotes,
  hasTradeNotes,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  monthPnl,
}: CalendarGridProps) {
  const { mask } = usePrivacy();
  const { firstDay, daysInMonth } = getMonthDays(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Month header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            className="rounded-full p-1 transition-colors hover:bg-[hsl(var(--landing-border))]"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: "hsl(var(--landing-text))" }} />
          </button>
          <span className="text-sm font-semibold tracking-tight" style={{ color: "hsl(var(--landing-text))" }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={onNextMonth}
            className="rounded-full p-1 transition-colors hover:bg-[hsl(var(--landing-border))]"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" style={{ color: "hsl(var(--landing-text))" }} />
          </button>
        </div>
        <span
          className="text-xs font-semibold tabular-nums"
          style={{
            color:
              monthPnl > 0
                ? "hsl(var(--pnl-positive))"
                : monthPnl < 0
                  ? "hsl(var(--pnl-negative))"
                  : "hsl(var(--landing-text-muted))",
          }}
        >
          P&L: {mask(formatPnl(monthPnl))}
        </span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center">
        {DAY_HEADERS.map((label, i) => (
          <div
            key={i}
            className="py-1 text-[9px] font-medium uppercase tracking-wide"
            style={{ color: "hsl(var(--landing-text-muted))" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const data = dailyData.get(dateStr);
          const hasTrades = !!data && data.tradeCount > 0;
          const pnl = data?.totalPnl ?? null;
          const isSelected = selectedDate === dateStr;
          const dayOfWeek = (firstDay + day - 1) % 7;
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const hasDayNote = !!(dayNotes && dayNotes[dateStr]?.observation);
          const hasTradeNote = !!(hasTradeNotes && hasTradeNotes.has(dateStr));

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className="relative flex aspect-square flex-col items-center justify-center rounded-lg transition-transform hover:scale-105"
              style={{
                backgroundColor: hasTrades ? cellColor(pnl) : "transparent",
                border: isSelected
                  ? "1.5px solid hsl(var(--landing-text) / 0.4)"
                  : "1px solid transparent",
                opacity: !hasTrades && isWeekend ? 0.3 : 1,
              }}
            >
              <span
                className="text-[10px] tabular-nums"
                style={{
                  color: hasTrades
                    ? "hsl(var(--landing-text))"
                    : "hsl(var(--landing-text-muted))",
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                {day}
              </span>
              {hasTrades && pnl !== null && (
                <span
                  className="text-[7px] font-semibold tabular-nums"
                  style={{
                    color:
                      pnl > 0
                        ? "hsl(var(--pnl-text-positive))"
                        : pnl < 0
                          ? "hsl(var(--pnl-text-negative))"
                          : "hsl(var(--landing-text-muted))",
                  }}
                >
                  {mask(formatPnl(pnl))}
                </span>
              )}
              {/* Note indicator */}
              {(hasDayNote || hasTradeNote) && (
                <span
                  className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#3b82f6" }}
                  title={hasDayNote ? "Dia com anotacao" : "Trades com notas"}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
