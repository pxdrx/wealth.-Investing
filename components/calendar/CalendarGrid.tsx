"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayData, DayNote } from "./types";
import { cellColor, formatPnl, getMonthGrid } from "./utils";
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

const DAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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
  const cells = getMonthGrid(year, month);

  return (
    <div className="flex flex-col gap-1">
      {/* Month header */}
      <div className="flex items-center justify-between px-1 mb-2">
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
      <div className="grid grid-cols-7">
        {DAY_HEADERS.map((label, i) => (
          <div
            key={i}
            className="py-1.5 text-[10px] font-semibold uppercase tracking-wider text-center border-b"
            style={{ color: "hsl(var(--landing-text-muted))", borderColor: "hsl(var(--landing-border))" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
          const data = cell.isCurrentMonth ? dailyData.get(dateStr) : undefined;
          const hasTrades = !!data && data.tradeCount > 0;
          const pnl = data?.totalPnl ?? null;
          const isSelected = selectedDate === dateStr;
          const colIndex = i % 7;
          const isWeekend = colIndex >= 5; // Sat=5, Sun=6
          const hasDayNote = !!(cell.isCurrentMonth && dayNotes && dayNotes[dateStr]?.observation);
          const hasTradeNote = !!(cell.isCurrentMonth && hasTradeNotes && hasTradeNotes.has(dateStr));

          return (
            <button
              key={`${cell.year}-${cell.month}-${cell.day}`}
              onClick={() => onSelectDate(dateStr)}
              disabled={!cell.isCurrentMonth}
              className="relative flex min-h-[68px] flex-col items-start justify-start p-1.5 border-b border-r transition-colors hover:bg-[hsl(var(--landing-border)/0.3)]"
              style={{
                backgroundColor: hasTrades ? cellColor(pnl) : "transparent",
                borderColor: "hsl(var(--landing-border) / 0.5)",
                opacity: !cell.isCurrentMonth ? 0.3 : (!hasTrades && isWeekend ? 0.5 : 1),
                outline: isSelected ? "2px solid hsl(var(--landing-text) / 0.4)" : "none",
                outlineOffset: "-2px",
              }}
            >
              {/* Day number */}
              <span
                className="text-xs tabular-nums"
                style={{
                  color: hasTrades
                    ? "hsl(var(--landing-text))"
                    : "hsl(var(--landing-text-muted))",
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                {cell.day}
              </span>

              {/* Trade count */}
              {hasTrades && (
                <span
                  className="text-[9px] mt-auto"
                  style={{ color: "hsl(var(--landing-text-muted))" }}
                >
                  {data!.tradeCount} trade{data!.tradeCount !== 1 ? "s" : ""}
                </span>
              )}

              {/* P&L value */}
              {hasTrades && pnl !== null && (
                <span
                  className="text-[11px] font-bold tabular-nums"
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
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#3b82f6" }}
                  title={hasDayNote ? "Dia com anotação" : "Trades com notas"}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
