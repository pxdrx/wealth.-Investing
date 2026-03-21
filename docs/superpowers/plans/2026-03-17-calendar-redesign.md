# Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Dashboard and Journal calendars to match the premium landing page mockup style, with inline day-detail panel and a new Journal Briefing card.

**Architecture:** Shared `CalendarPnl` component used by both Dashboard (consolidated) and Journal (per-account). New `JournalBriefing` premium card with expanded KPIs, equity sparkline, and recent trades. Landing page design tokens (`landing-card`, mono typography, accent colors) applied throughout.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Recharts (sparkline), Framer Motion

**Spec:** `docs/superpowers/specs/2026-03-17-calendar-redesign-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `components/calendar/CalendarPnl.tsx` | Main wrapper: KPI strip + CalendarGrid + DayDetailPanel |
| `components/calendar/CalendarGrid.tsx` | Month grid with colored cells, navigation, day selection |
| `components/calendar/DayDetailPanel.tsx` | 280px panel: day KPIs, notes, toggle, execution placeholder |
| `components/calendar/types.ts` | Shared interfaces: DayData, DayNote, CalendarPnlProps |
| `components/calendar/utils.ts` | Data aggregation: trades→DayData[], cellColor(), streak calc |
| `components/dashboard/JournalBriefing.tsx` | Premium briefing: KPIs + sparkline + recent trades |

### Modified Files
| File | Changes |
|------|---------|
| `app/app/page.tsx` | Reorder: Watchlist → CalendarPnl → JournalBriefing → News. Remove old Journal Summary section. |
| `app/app/journal/page.tsx` | Remove Calendar tab (index 3), integrate CalendarPnl into Visao Geral below equity curve. Remove DayDetailModal usage. |

### Deprecated (not deleted, just unused)
| File | Reason |
|------|--------|
| `components/journal/PnlCalendar.tsx` | Replaced by `components/calendar/CalendarPnl.tsx` |

---

## Chunk 1: Shared Types & Utilities

### Task 1: Create shared types

**Files:**
- Create: `components/calendar/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// components/calendar/types.ts

export interface DayData {
  date: string; // YYYY-MM-DD
  totalPnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
  bestTrade: number;
  worstTrade: number;
  byAccount?: Record<string, { accountName: string; pnl: number; trades: number }>;
}

export interface DayNote {
  observation: string;
  tags: string[] | null;
}

export interface TradeRow {
  id: string;
  net_pnl_usd: number;
  opened_at: string;
  account_id: string;
  symbol: string;
  direction: string;
}

export interface CalendarPnlProps {
  trades: TradeRow[];
  accounts?: { id: string; name: string }[];
  dayNotes?: Record<string, DayNote>;
  showConsolidatedToggle?: boolean;
  showWindowChrome?: boolean;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `components/calendar/types.ts`

- [ ] **Step 3: Commit**

```bash
git add components/calendar/types.ts
git commit -m "feat(calendar): add shared types for calendar redesign"
```

---

### Task 2: Create utility functions

**Files:**
- Create: `components/calendar/utils.ts`

- [ ] **Step 1: Create utils with aggregation and color functions**

```typescript
// components/calendar/utils.ts
import { DayData, TradeRow } from "./types";

/** Aggregate individual trades into per-day summaries */
export function aggregateByDay(
  trades: TradeRow[],
  accounts?: { id: string; name: string }[]
): Map<string, DayData> {
  const map = new Map<string, DayData>();

  trades.forEach((t) => {
    const dateKey = t.opened_at.slice(0, 10); // YYYY-MM-DD
    const existing = map.get(dateKey) || {
      date: dateKey,
      totalPnl: 0,
      tradeCount: 0,
      wins: 0,
      losses: 0,
      bestTrade: -Infinity,
      worstTrade: Infinity,
      byAccount: accounts ? {} : undefined,
    };

    existing.totalPnl += t.net_pnl_usd;
    existing.tradeCount += 1;
    if (t.net_pnl_usd > 0) existing.wins += 1;
    if (t.net_pnl_usd < 0) existing.losses += 1;
    if (t.net_pnl_usd > existing.bestTrade) existing.bestTrade = t.net_pnl_usd;
    if (t.net_pnl_usd < existing.worstTrade) existing.worstTrade = t.net_pnl_usd;

    if (existing.byAccount && accounts) {
      const accName = accounts.find((a) => a.id === t.account_id)?.name ?? "Unknown";
      const accKey = t.account_id;
      if (!existing.byAccount[accKey]) {
        existing.byAccount[accKey] = { accountName: accName, pnl: 0, trades: 0 };
      }
      existing.byAccount[accKey].pnl += t.net_pnl_usd;
      existing.byAccount[accKey].trades += 1;
    }

    // Fix -Infinity/Infinity for days with no trades matching condition
    if (existing.bestTrade === -Infinity) existing.bestTrade = 0;
    if (existing.worstTrade === Infinity) existing.worstTrade = 0;

    map.set(dateKey, existing);
  });

  return map;
}

/** Cell background color — matches JournalMockup.tsx logic */
export function cellColor(pnl: number | null): string {
  if (pnl === null) return "transparent";
  if (pnl > 400) return "hsl(var(--landing-accent) / 0.7)";
  if (pnl > 0) return "hsl(var(--landing-accent) / 0.35)";
  if (pnl === 0) return "hsl(var(--landing-border))";
  return "hsl(var(--landing-accent-danger) / 0.4)";
}

/** Calculate current win/loss streak from daily data */
export function calculateStreak(dailyData: Map<string, DayData>): { count: number; type: "W" | "L" } {
  const sorted = Array.from(dailyData.values())
    .filter((d) => d.tradeCount > 0)
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  if (sorted.length === 0) return { count: 0, type: "W" };

  const firstType = sorted[0].totalPnl >= 0 ? "W" : "L";
  let count = 0;

  for (const day of sorted) {
    const dayType = day.totalPnl >= 0 ? "W" : "L";
    if (dayType !== firstType) break;
    count++;
  }

  return { count, type: firstType };
}

/** Format USD value compactly */
export function formatPnl(value: number): string {
  const sign = value >= 0 ? "+" : "";
  if (Math.abs(value) >= 1000) {
    return `${sign}$${(value / 1000).toFixed(1)}k`;
  }
  return `${sign}$${value.toFixed(0)}`;
}

/** Get days in month with proper offset for first day */
export function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/calendar/utils.ts
git commit -m "feat(calendar): add data aggregation and color utilities"
```

---

## Chunk 2: CalendarGrid Component

### Task 3: Create CalendarGrid

**Files:**
- Create: `components/calendar/CalendarGrid.tsx`
- Reference: `components/landing/JournalMockup.tsx` (lines 52-115 for style)

- [ ] **Step 1: Create CalendarGrid component**

The grid renders a 7-column month calendar with colored cells. It handles:
- Month navigation (prev/next)
- Day selection (click → callback)
- P&L color coding per `cellColor()`
- Selected day border highlight

```typescript
// components/calendar/CalendarGrid.tsx
"use client";

import { useMemo } from "react";
import { DayData } from "./types";
import { cellColor, formatPnl, getMonthDays } from "./utils";

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  dailyData: Map<string, DayData>;
  selectedDate: string | null; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  monthPnl: number;
}

const DAY_HEADERS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function CalendarGrid({
  year, month, dailyData, selectedDate, onSelectDate,
  onPrevMonth, onNextMonth, monthPnl,
}: CalendarGridProps) {
  const { firstDay, daysInMonth } = useMemo(() => getMonthDays(year, month), [year, month]);

  const monthLabel = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const cells = useMemo(() => {
    const result: (number | null)[] = [];
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) result.push(null);
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    return result;
  }, [firstDay, daysInMonth]);

  return (
    <div className="flex-1 p-4 md:p-5">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--landing-text))" }}>
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          </span>
          <div className="flex gap-1">
            <button
              onClick={onPrevMonth}
              className="h-[22px] w-[22px] rounded-md flex items-center justify-center text-[10px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ border: "1px solid hsl(var(--landing-border))", color: "hsl(var(--landing-text-muted))" }}
            >
              ‹
            </button>
            <button
              onClick={onNextMonth}
              className="h-[22px] w-[22px] rounded-md flex items-center justify-center text-[10px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ border: "1px solid hsl(var(--landing-border))", color: "hsl(var(--landing-text-muted))" }}
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs" style={{ color: "hsl(var(--landing-text-muted))" }}>P&L:</span>
          <span className="font-mono text-xs font-semibold" style={{ color: "hsl(var(--landing-text))" }}>
            {formatPnl(monthPnl)}
          </span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center font-mono text-[9px] py-1" style={{ color: "hsl(var(--landing-text-muted))" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = dailyData.get(dateKey);
          const pnl = dayData ? dayData.totalPnl : null;
          const isSelected = dateKey === selectedDate;
          const hasTrades = dayData && dayData.tradeCount > 0;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className="relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105"
              style={{
                backgroundColor: cellColor(pnl),
                border: isSelected
                  ? "1.5px solid hsl(var(--landing-text) / 0.4)"
                  : "1px solid transparent",
              }}
            >
              <span
                className={`font-mono text-[10px] ${isSelected ? "font-bold" : ""}`}
                style={{
                  color: pnl === null
                    ? "hsl(var(--landing-text-muted) / 0.3)"
                    : "hsl(var(--landing-text))",
                }}
              >
                {day}
              </span>
              {hasTrades && pnl !== null && pnl !== 0 && (
                <span
                  className="font-mono text-[7px]"
                  style={{
                    color: pnl > 0
                      ? "hsl(var(--landing-text) / 0.7)"
                      : "hsl(var(--landing-text) / 0.6)",
                  }}
                >
                  {pnl > 0 ? "+" : ""}{Math.round(pnl)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/calendar/CalendarGrid.tsx
git commit -m "feat(calendar): add CalendarGrid with landing page style"
```

---

## Chunk 3: DayDetailPanel Component

### Task 4: Create DayDetailPanel

**Files:**
- Create: `components/calendar/DayDetailPanel.tsx`
- Reference: `components/landing/JournalMockup.tsx` (lines 117-204 for style)

- [ ] **Step 1: Create DayDetailPanel**

```typescript
// components/calendar/DayDetailPanel.tsx
"use client";

import { useState } from "react";
import { DayData, DayNote } from "./types";
import { formatPnl } from "./utils";

interface DayDetailPanelProps {
  selectedDate: string | null; // YYYY-MM-DD
  dayData: DayData | null;
  dayNote: DayNote | null;
  showConsolidatedToggle?: boolean;
}

export function DayDetailPanel({ selectedDate, dayData, dayNote, showConsolidatedToggle }: DayDetailPanelProps) {
  const [viewMode, setViewMode] = useState<"consolidated" | "per-account">("consolidated");

  if (!selectedDate) {
    return (
      <div
        className="lg:w-[280px] border-t lg:border-t-0 lg:border-l p-4 md:p-5 flex items-center justify-center"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <p className="font-mono text-xs text-center" style={{ color: "hsl(var(--landing-text-muted))" }}>
          Selecione um dia para ver detalhes.
        </p>
      </div>
    );
  }

  const dateObj = new Date(selectedDate + "T12:00:00");
  const dateLabel = dateObj.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

  const kpis = [
    { label: "Trades", value: dayData ? String(dayData.tradeCount) : "0" },
    {
      label: "Win Rate",
      value: dayData && dayData.tradeCount > 0
        ? `${Math.round((dayData.wins / dayData.tradeCount) * 100)}%`
        : "—",
    },
    {
      label: "Melhor",
      value: dayData && dayData.bestTrade !== 0 ? formatPnl(dayData.bestTrade) : "—",
      color: "hsl(var(--landing-accent))",
    },
    {
      label: "Pior",
      value: dayData && dayData.worstTrade !== 0 ? formatPnl(dayData.worstTrade) : "—",
      color: "hsl(var(--landing-accent-danger))",
    },
  ];

  return (
    <div
      className="lg:w-[280px] border-t lg:border-t-0 lg:border-l p-4 md:p-5"
      style={{ borderColor: "hsl(var(--landing-border))" }}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: "hsl(var(--landing-text))" }}>
          {dateLabel}
        </span>
        <span className="font-mono text-xs font-semibold" style={{ color: "hsl(var(--landing-text))" }}>
          {dayData ? formatPnl(dayData.totalPnl) : "$0"}
        </span>
      </div>

      {/* KPIs 2x2 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg px-2.5 py-2"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <div className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "hsl(var(--landing-text-muted))" }}>
              {kpi.label}
            </div>
            <div
              className="font-mono text-xs font-semibold"
              style={{ color: kpi.color ?? "hsl(var(--landing-text))" }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* No trades message */}
      {dayData && dayData.tradeCount === 0 && (
        <p className="font-mono text-[10px] mb-4" style={{ color: "hsl(var(--landing-text-muted))" }}>
          Sem operacoes neste dia.
        </p>
      )}

      {/* Observacoes */}
      {dayNote?.observation && (
        <div className="mb-3">
          <div className="font-mono text-[8px] uppercase tracking-wider mb-1.5" style={{ color: "hsl(var(--landing-text-muted))" }}>
            Observacoes
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: "hsl(var(--landing-text-secondary, var(--landing-text-muted)))" }}>
            {dayNote.observation}
          </p>
        </div>
      )}

      {/* Consolidado / Por conta toggle */}
      {showConsolidatedToggle && dayData?.byAccount && (
        <div className="mb-3">
          <div
            className="rounded-lg p-1.5"
            style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
          >
            <div
              className="flex rounded-md overflow-hidden"
              style={{ border: "1px solid hsl(var(--landing-border))" }}
            >
              <button
                onClick={() => setViewMode("consolidated")}
                className="flex-1 py-1 px-2 font-mono text-[9px] font-semibold text-center transition-colors"
                style={{
                  backgroundColor: viewMode === "consolidated" ? "hsl(var(--landing-text))" : "transparent",
                  color: viewMode === "consolidated" ? "hsl(var(--landing-bg-elevated))" : "hsl(var(--landing-text-muted))",
                }}
              >
                Consolidado
              </button>
              <button
                onClick={() => setViewMode("per-account")}
                className="flex-1 py-1 px-2 font-mono text-[9px] text-center transition-colors"
                style={{
                  backgroundColor: viewMode === "per-account" ? "hsl(var(--landing-text))" : "transparent",
                  color: viewMode === "per-account" ? "hsl(var(--landing-bg-elevated))" : "hsl(var(--landing-text-muted))",
                }}
              >
                Por conta
              </button>
            </div>
          </div>

          {/* Per-account breakdown */}
          {viewMode === "per-account" && dayData.byAccount && (
            <div className="mt-2 space-y-1">
              {Object.values(dayData.byAccount).map((acc) => (
                <div
                  key={acc.accountName}
                  className="flex items-center justify-between font-mono text-[10px] py-1 px-2 rounded"
                  style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                >
                  <span style={{ color: "hsl(var(--landing-text-muted))" }}>{acc.accountName}</span>
                  <span
                    style={{
                      color: acc.pnl >= 0
                        ? "hsl(var(--landing-accent))"
                        : "hsl(var(--landing-accent-danger))",
                    }}
                  >
                    {formatPnl(acc.pnl)} ({acc.trades})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Execution rating placeholder */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "hsl(var(--landing-text-muted))" }}>
          Execucao
        </span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="h-1.5 w-4 rounded-full"
              style={{ backgroundColor: "hsl(var(--landing-border))" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/calendar/DayDetailPanel.tsx
git commit -m "feat(calendar): add DayDetailPanel with KPIs, notes, and toggle"
```

---

## Chunk 4: CalendarPnl Wrapper

### Task 5: Create CalendarPnl wrapper component

**Files:**
- Create: `components/calendar/CalendarPnl.tsx`

- [ ] **Step 1: Create CalendarPnl — main component that combines KPI strip + CalendarGrid + DayDetailPanel**

```typescript
// components/calendar/CalendarPnl.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import { CalendarPnlProps, DayData } from "./types";
import { aggregateByDay } from "./utils";
import { CalendarGrid } from "./CalendarGrid";
import { DayDetailPanel } from "./DayDetailPanel";

export function CalendarPnl({
  trades,
  accounts,
  dayNotes,
  showConsolidatedToggle = false,
  showWindowChrome = true,
}: CalendarPnlProps) {
  const now = new Date();
  const [displayYear, setDisplayYear] = useState(now.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dailyData = useMemo(
    () => aggregateByDay(trades, accounts),
    [trades, accounts]
  );

  // Month totals for KPI strip
  const monthStats = useMemo(() => {
    let totalPnl = 0;
    let totalTrades = 0;
    let wins = 0;
    let daysOperated = 0;

    dailyData.forEach((day) => {
      const [y, m] = day.date.split("-").map(Number);
      if (y === displayYear && m === displayMonth + 1) {
        totalPnl += day.totalPnl;
        totalTrades += day.tradeCount;
        wins += day.wins;
        if (day.tradeCount > 0) daysOperated++;
      }
    });

    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    return { totalPnl, totalTrades, winRate, daysOperated };
  }, [dailyData, displayYear, displayMonth]);

  const selectedDayData: DayData | null = selectedDate ? dailyData.get(selectedDate) ?? null : null;
  const selectedDayNote = selectedDate && dayNotes ? dayNotes[selectedDate] ?? null : null;

  const handlePrevMonth = useCallback(() => {
    setDisplayMonth((m) => {
      if (m === 0) {
        setDisplayYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDate(null);
  }, []);

  const handleNextMonth = useCallback(() => {
    setDisplayMonth((m) => {
      if (m === 11) {
        setDisplayYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDate(null);
  }, []);

  const formatPnl = (v: number) => {
    const sign = v >= 0 ? "+" : "";
    return `${sign}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const monthLabel = new Date(displayYear, displayMonth).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const kpis = [
    { label: "P&L Mes", value: formatPnl(monthStats.totalPnl), color: monthStats.totalPnl >= 0 ? "hsl(var(--landing-accent))" : "hsl(var(--landing-accent-danger))" },
    { label: "Win Rate", value: `${monthStats.winRate}%` },
    { label: "Trades", value: String(monthStats.totalTrades) },
    { label: "Dias Operados", value: String(monthStats.daysOperated) },
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
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent-danger) / 0.5)" }} />
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent-warning) / 0.5)" }} />
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent) / 0.4)" }} />
          </div>
          <span className="font-mono text-[10px] ml-2" style={{ color: "hsl(var(--landing-text-muted))" }}>
            wealth.Investing — {showConsolidatedToggle ? "Dashboard" : "Journal"}
          </span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="px-4 md:px-5 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--landing-text))" }}>
            {showConsolidatedToggle ? "Consolidado de Contas" : "Calendario P&L"}
          </span>
          <span className="text-[11px]" style={{ color: "hsl(var(--landing-text-muted))" }}>
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg px-3 py-2.5"
              style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
            >
              <div className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "hsl(var(--landing-text-muted))" }}>
                {kpi.label}
              </div>
              <div
                className="font-mono text-sm font-semibold mt-0.5"
                style={{ color: kpi.color ?? "hsl(var(--landing-text))" }}
              >
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar + Day Detail */}
      <div
        className="flex flex-col lg:flex-row border-t"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
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
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/calendar/CalendarPnl.tsx
git commit -m "feat(calendar): add CalendarPnl wrapper with KPI strip and landing style"
```

---

## Chunk 5: JournalBriefing Premium Card

### Task 6: Create JournalBriefing component

**Files:**
- Create: `components/dashboard/JournalBriefing.tsx`
- Reference: Recharts `AreaChart` for sparkline (already in project deps)

- [ ] **Step 1: Create JournalBriefing — premium briefing card with 3 sections**

```typescript
// components/dashboard/JournalBriefing.tsx
"use client";

import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { TradeRow } from "@/components/calendar/types";
import { aggregateByDay, calculateStreak, formatPnl } from "@/components/calendar/utils";

interface JournalBriefingProps {
  trades: TradeRow[];
  accounts?: { id: string; name: string }[];
}

export function JournalBriefing({ trades, accounts }: JournalBriefingProps) {
  const dailyData = useMemo(() => aggregateByDay(trades, accounts), [trades, accounts]);

  // Month stats
  const stats = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    let totalPnl = 0, totalTrades = 0, wins = 0, daysOperated = 0;
    let bestTrade = -Infinity, worstTrade = Infinity;

    dailyData.forEach((day) => {
      const [dy, dm] = day.date.split("-").map(Number);
      if (dy === y && dm === m) {
        totalPnl += day.totalPnl;
        totalTrades += day.tradeCount;
        wins += day.wins;
        if (day.tradeCount > 0) daysOperated++;
        if (day.bestTrade > bestTrade) bestTrade = day.bestTrade;
        if (day.worstTrade < worstTrade) worstTrade = day.worstTrade;
      }
    });

    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    const avgWin = wins > 0 ? totalPnl / wins : 0;
    const losses = totalTrades - wins;
    const avgLoss = losses > 0 ? (totalPnl - avgWin * wins) / losses : 0;
    const payoff = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
    const expectancy = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const daysInMonth = new Date(y, m, 0).getDate();

    return {
      totalPnl, totalTrades, winRate, daysOperated, daysInMonth,
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
      payoff, expectancy,
    };
  }, [dailyData]);

  const streak = useMemo(() => calculateStreak(dailyData), [dailyData]);

  // Equity sparkline data (last 30 days cumulative)
  const sparklineData = useMemo(() => {
    const sorted = Array.from(dailyData.values())
      .filter((d) => d.tradeCount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    let cumulative = 0;
    return sorted.slice(-30).map((d) => {
      cumulative += d.totalPnl;
      return { date: d.date, value: cumulative };
    });
  }, [dailyData]);

  // Recent 5 trades
  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => b.opened_at.localeCompare(a.opened_at))
      .slice(0, 5);
  }, [trades]);

  const kpiRows = [
    { label: "P&L Mes", value: formatPnl(stats.totalPnl), color: stats.totalPnl >= 0 ? "hsl(var(--landing-accent))" : "hsl(var(--landing-accent-danger))", large: true },
    { label: "Win Rate", value: `${stats.winRate}%`, bar: stats.winRate },
    { label: "Payoff", value: stats.payoff.toFixed(2) },
    { label: "Expectativa", value: formatPnl(stats.expectancy) },
    { label: "Melhor Trade", value: formatPnl(stats.bestTrade), color: "hsl(var(--landing-accent))" },
    { label: "Pior Trade", value: formatPnl(stats.worstTrade), color: "hsl(var(--landing-accent-danger))" },
    { label: "Dias Op.", value: `${stats.daysOperated}/${stats.daysInMonth}` },
    { label: "Streak", value: `${streak.count}${streak.type}`, color: streak.type === "W" ? "hsl(var(--landing-accent))" : "hsl(var(--landing-accent-danger))" },
  ];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "agora";
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="landing-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: "hsl(var(--landing-border))" }}
      >
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent-danger) / 0.5)" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent-warning) / 0.5)" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--landing-accent) / 0.4)" }} />
        </div>
        <span className="font-mono text-[10px] ml-2" style={{ color: "hsl(var(--landing-text-muted))" }}>
          wealth.Investing — Intelligence Briefing
        </span>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Section A: Performance Pulse */}
        <div className="flex-[4] p-4 md:p-5">
          <div className="font-mono text-[8px] uppercase tracking-wider mb-3" style={{ color: "hsl(var(--landing-text-muted))" }}>
            Performance Pulse
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {kpiRows.map((kpi) => (
              <div key={kpi.label} className="flex items-center justify-between">
                <span className="font-mono text-[9px]" style={{ color: "hsl(var(--landing-text-muted))" }}>
                  {kpi.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {kpi.bar !== undefined && (
                    <div className="w-12 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--landing-border))" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${kpi.bar}%`,
                          backgroundColor: "hsl(var(--landing-accent))",
                        }}
                      />
                    </div>
                  )}
                  <span
                    className={`font-mono font-semibold ${kpi.large ? "text-base" : "text-[11px]"}`}
                    style={{ color: kpi.color ?? "hsl(var(--landing-text))" }}
                  >
                    {kpi.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section B: Equity Sparkline */}
        <div
          className="flex-[3] p-4 md:p-5 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: "hsl(var(--landing-border))" }}
        >
          <div className="font-mono text-[8px] uppercase tracking-wider mb-3" style={{ color: "hsl(var(--landing-text-muted))" }}>
            Equity (30d)
          </div>
          <div className="h-[100px]">
            {sparklineData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--landing-accent))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--landing-accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--landing-accent))"
                    strokeWidth={1.5}
                    fill="url(#sparkGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="font-mono text-[10px]" style={{ color: "hsl(var(--landing-text-muted))" }}>
                  Dados insuficientes
                </span>
              </div>
            )}
          </div>
          {sparklineData.length > 0 && (
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[8px]" style={{ color: "hsl(var(--landing-text-muted))" }}>
                {formatPnl(sparklineData[0]?.value ?? 0)}
              </span>
              <span className="font-mono text-[8px] font-semibold" style={{ color: "hsl(var(--landing-accent))" }}>
                {formatPnl(sparklineData[sparklineData.length - 1]?.value ?? 0)}
              </span>
            </div>
          )}
        </div>

        {/* Section C: Recent Activity */}
        <div
          className="flex-[3] p-4 md:p-5 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: "hsl(var(--landing-border))" }}
        >
          <div className="font-mono text-[8px] uppercase tracking-wider mb-3" style={{ color: "hsl(var(--landing-text-muted))" }}>
            Ultimas Trades
          </div>
          <div className="space-y-1.5">
            {recentTrades.length === 0 ? (
              <p className="font-mono text-[10px]" style={{ color: "hsl(var(--landing-text-muted))" }}>
                Nenhuma trade registrada.
              </p>
            ) : (
              recentTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-1 px-2 rounded-md"
                  style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-[8px] font-bold px-1 py-0.5 rounded"
                      style={{
                        backgroundColor: trade.direction === "long"
                          ? "hsl(var(--landing-accent) / 0.15)"
                          : "hsl(var(--landing-accent-danger) / 0.15)",
                        color: trade.direction === "long"
                          ? "hsl(var(--landing-accent))"
                          : "hsl(var(--landing-accent-danger))",
                      }}
                    >
                      {trade.direction === "long" ? "▲" : "▼"}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: "hsl(var(--landing-text))" }}>
                      {trade.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-[10px] font-semibold"
                      style={{
                        color: trade.net_pnl_usd >= 0
                          ? "hsl(var(--landing-accent))"
                          : "hsl(var(--landing-accent-danger))",
                      }}
                    >
                      {formatPnl(trade.net_pnl_usd)}
                    </span>
                    <span className="font-mono text-[8px]" style={{ color: "hsl(var(--landing-text-muted))" }}>
                      {timeAgo(trade.opened_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/JournalBriefing.tsx
git commit -m "feat(dashboard): add premium JournalBriefing with sparkline and recent trades"
```

---

## Chunk 6: Dashboard Integration

### Task 7: Update Dashboard page

**Files:**
- Modify: `app/app/page.tsx`

The Dashboard currently renders: Watchlist → News → Journal Summary KPIs → PnlCalendar.
New order: Watchlist → CalendarPnl (consolidated) → JournalBriefing → News.

- [ ] **Step 1: Add imports for new components**

At the top of `app/app/page.tsx`, add:
```typescript
import { CalendarPnl } from "@/components/calendar/CalendarPnl";
import { JournalBriefing } from "@/components/dashboard/JournalBriefing";
import { TradeRow } from "@/components/calendar/types";
```

Remove old import:
```typescript
// Remove: import PnlCalendar from "@/components/journal/PnlCalendar";
```

- [ ] **Step 2: Add day_notes fetch to the existing data loading useEffect**

Inside the useEffect that fetches trades (around line 68), after fetching trades and accounts, add a fetch for day_notes:
```typescript
// After existing trades/accounts fetch, add:
const { data: notesData } = await supabase
  .from("day_notes")
  .select("date, observation, tags")
  .eq("user_id", uid);

const notesMap: Record<string, { observation: string; tags: string[] | null }> = {};
if (notesData) {
  notesData.forEach((n: { date: string; observation: string; tags: string[] | null }) => {
    notesMap[n.date] = { observation: n.observation, tags: n.tags };
  });
}
// Store in state: setDayNotes(notesMap)
```

Add state: `const [dayNotes, setDayNotes] = useState<Record<string, { observation: string; tags: string[] | null }>>({});`

- [ ] **Step 3: Replace render sections**

Remove the old "Resumo do Journal" card section and the old `<PnlCalendar>` at the bottom.

After the Watchlist card, add:
```tsx
{/* Calendar Consolidado */}
<CalendarPnl
  trades={journalTrades as TradeRow[]}
  accounts={Array.from(accountsById.values()).map(a => ({ id: a.id, name: a.name }))}
  dayNotes={dayNotes}
  showConsolidatedToggle
  showWindowChrome
/>

{/* Journal Briefing */}
<JournalBriefing
  trades={journalTrades as TradeRow[]}
  accounts={Array.from(accountsById.values()).map(a => ({ id: a.id, name: a.name }))}
/>
```

Keep the News card after JournalBriefing.

- [ ] **Step 4: Ensure journalTrades query includes all needed fields**

The current query selects `net_pnl_usd, opened_at, account_id`. Update to include:
```typescript
.select("id, net_pnl_usd, opened_at, account_id, symbol, direction")
```

- [ ] **Step 5: Verify build and test**

Run: `npm run build 2>&1 | tail -20`

- [ ] **Step 6: Commit**

```bash
git add app/app/page.tsx
git commit -m "feat(dashboard): integrate CalendarPnl and JournalBriefing, reorder sections"
```

---

## Chunk 7: Journal Integration

### Task 8: Update Journal page

**Files:**
- Modify: `app/app/journal/page.tsx`

Remove Calendar tab, integrate CalendarPnl into Visao Geral below equity curve.

- [ ] **Step 1: Update imports**

Add:
```typescript
import { CalendarPnl } from "@/components/calendar/CalendarPnl";
import { TradeRow, DayNote } from "@/components/calendar/types";
```

Remove:
```typescript
// Remove: import PnlCalendar from "@/components/journal/PnlCalendar";
// Remove: import { DayDetailModal } from "@/components/journal/DayDetailModal";
```

- [ ] **Step 2: Remove Calendar tab from tabs array**

Update the tabs array to remove the Calendar entry and its preceding separator. Recalculate section constants:
```typescript
const tabs = [
  { title: "Visao Geral", icon: LayoutDashboard },      // 0
  { title: "Trades", icon: TrendingUp },                 // 1
  { type: "separator" as const },                        // 2
  { title: "Estatisticas", icon: BarChart2 },           // 3
  { type: "separator" as const },                        // 4
  { title: "Importar MT5", icon: Upload },              // 5
];

const SECTION_OVERVIEW = 0;
const SECTION_TRADES = 1;
const SECTION_STATS = 3;
const SECTION_IMPORT = 5;
```

Remove `SECTION_CALENDAR` constant entirely.

- [ ] **Step 3: Add day_notes fetch**

In the data loading section, add a fetch for day_notes filtered by account:
```typescript
const [dayNotes, setDayNotes] = useState<Record<string, DayNote>>({});

// Inside loadTrades or a separate useEffect:
const { data: notesData } = await supabase
  .from("day_notes")
  .select("date, observation, tags")
  .eq("user_id", userId);

const notesMap: Record<string, DayNote> = {};
notesData?.forEach((n: { date: string; observation: string; tags: string[] | null }) => {
  notesMap[n.date] = { observation: n.observation, tags: n.tags };
});
setDayNotes(notesMap);
```

- [ ] **Step 4: Add CalendarPnl to Visao Geral section**

In the Visao Geral tab content (SECTION_OVERVIEW), after `<JournalEquityChart>`, add:
```tsx
{/* Calendar P&L */}
<CalendarPnl
  trades={trades as unknown as TradeRow[]}
  dayNotes={dayNotes}
  showConsolidatedToggle={false}
  showWindowChrome
/>
```

- [ ] **Step 5: Remove old Calendar tab rendering**

Remove the `SECTION_CALENDAR` case that renders the old `<PnlCalendar>` and `<DayDetailModal>`. Remove `dayModalDate`, `dayModalOpen`, `noteVersion` state variables if no longer used.

- [ ] **Step 6: Ensure trades query includes needed fields**

The current query already selects `id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, context, notes, mistakes` — this includes all fields needed by `TradeRow`. No query change needed.

- [ ] **Step 7: Verify build and test**

Run: `npm run build 2>&1 | tail -20`

- [ ] **Step 8: Commit**

```bash
git add app/app/journal/page.tsx
git commit -m "feat(journal): integrate CalendarPnl into Visao Geral, remove Calendar tab"
```

---

## Chunk 8: Final Polish & Verification

### Task 9: Verify full build and visual check

- [ ] **Step 1: Full build**

Run: `npm run build 2>&1 | tail -30`
Expected: No errors

- [ ] **Step 2: Start dev server and visual test**

Run: `npm run dev`
Navigate to:
- `/app` (Dashboard) — verify: Watchlist → Calendar → Briefing → News order
- `/app/journal` (Journal) — verify: KPIs → Equity → Calendar integrated, no Calendar tab

- [ ] **Step 3: Test interactions**

- Click a day in Dashboard calendar → day detail panel updates
- Click "Por conta" toggle → shows per-account breakdown
- Click a day in Journal calendar → panel updates (per-account, no toggle)
- Navigate months (prev/next arrows)
- Verify dark mode works (toggle theme)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: calendar redesign with premium landing page style

- New CalendarPnl component with inline day detail panel
- JournalBriefing with sparkline, KPIs, and recent trades
- Dashboard: Watchlist → Calendar → Briefing → News
- Journal: Calendar integrated into Visao Geral
- Landing page design tokens throughout"
```

- [ ] **Step 5: Push to deploy**

```bash
git push origin main
```
