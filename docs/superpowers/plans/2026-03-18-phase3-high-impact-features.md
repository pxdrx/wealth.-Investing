# Phase 3 — High Impact Features — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 high-impact features to wealth.Investing: Reports & Analytics, Psychology Tags, AI Q&A with macro correlation, MFE/MAE Analysis, and Customizable Dashboard.

**Architecture:** Hybrid approach — each feature lives where it makes contextual sense. Reports as new page, Psychology inline in Journal, AI Q&A extends existing Coach, Dashboard gets widget system. All features share a global value visibility toggle (already partially implemented via PrivacyContext).

**Tech Stack:** Next.js 14 (App Router), TypeScript strict, Tailwind + shadcn/ui, Supabase (Postgres + RLS), Recharts, Framer Motion, lucide-react.

**Spec:** `docs/superpowers/specs/2026-03-18-phase3-high-impact-features-design.md`

**Testing strategy:** No test framework in project. Verify via: `npm run build` (zero TS errors), `npm run lint`, Playwright screenshots for visual verification.

**Critical rules (from CLAUDE.md):**
- `"use client"` on any component with hooks/events
- `bg-card` MUST use inline `style={{ backgroundColor: "hsl(var(--card))" }}`
- Never `.single()`, always `.maybeSingle()`
- Context API only (no Redux/Zustand)
- Cards: `rounded-[22px]`, buttons: `rounded-full`
- Layout: `mx-auto max-w-6xl px-6 py-10`

---

## Dependency Graph

```
Phase 3.1 (Foundation)
  ├── 3.2 (Reports) ──────┐
  ├── 3.3 (Psychology) ───┼──→ 3.4 (AI Q&A)
  ├── 3.5 (MFE/MAE) ──────┘
  └──────────────────────────→ 3.6 (Dashboard)
```

3.2, 3.3, and 3.5 can run **in parallel** after 3.1.
3.4 depends on 3.2 + 3.3. 3.6 depends on all widgets existing.

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `lib/trade-analytics.ts` | Pure functions: all 17+ trading metrics |
| `lib/psychology-tags.ts` | Tag definitions, Tiltmeter calculation, sentiment mapping |
| `lib/macro-events.ts` | Macro event types and correlation logic |
| `app/app/reports/page.tsx` | Reports page with tabs (Overview, Breakdowns, MFE/MAE, Psychology) |
| `components/reports/MetricCard.tsx` | Reusable metric display card |
| `components/reports/EquityCurve.tsx` | Recharts line chart for cumulative PnL |
| `components/reports/DrawdownChart.tsx` | Recharts area chart (inverted) |
| `components/reports/PnlDistribution.tsx` | Recharts histogram |
| `components/reports/DailyPnlChart.tsx` | Recharts bar chart of daily PnL |
| `components/reports/BreakdownCharts.tsx` | Symbol/direction/session/day/hour charts |
| `components/reports/MfeMaeScatter.tsx` | Recharts scatter plots for MFE/MAE |
| `components/reports/PsychologyAnalytics.tsx` | Psychology breakdown charts |
| `components/journal/PsychologySection.tsx` | Psychology inputs for TradeDetailModal |
| `components/dashboard/TiltmeterGauge.tsx` | Tiltmeter gauge widget |
| `components/dashboard/EquityCurveMini.tsx` | Sparkline equity curve widget |
| `components/dashboard/SessionHeatmap.tsx` | Session performance heatmap widget |
| `components/dashboard/WidgetRenderer.tsx` | Widget layout engine |
| `components/ui/MoneyDisplay.tsx` | Value-visibility-aware money formatter |
| `app/api/macro-calendar/route.ts` | Macro events fetch API |

### Modified Files
| File | Changes |
|------|---------|
| `components/layout/AppHeader.tsx` | Add global value visibility toggle (Eye icon already imported) |
| `components/context/ActiveAccountContext.tsx` | No changes needed — PrivacyContext already separate |
| `components/journal/TradeDetailModal.tsx` | Add PsychologySection, MFE/MAE fields |
| `components/journal/types.ts` | Extend JournalTradeRow with new fields |
| `components/dashboard/AccountsOverview.tsx` | Migrate from local mask to global MoneyDisplay |
| `app/app/page.tsx` | Add new widgets (Tiltmeter, EquityCurveMini), widget system |
| `app/app/journal/page.tsx` | Show psychology badges on trade list, Tiltmeter at top |
| `app/app/ai-coach/page.tsx` | Add "Analisar Meus Dados" quick action + new insight buttons |
| `lib/ai-stats.ts` | Extend PersonalTradeStats with psychology + MFE/MAE data |
| `lib/ai-prompts.ts` | Add TradeAnalytics + Psychology + Macro context blocks |
| `app/app/settings/page.tsx` | Add Dashboard layout customization section |

---

## Phase 3.1 — Foundation

### Task 1: MoneyDisplay Component

**Files:**
- Create: `components/ui/MoneyDisplay.tsx`

- [ ] **Step 1: Create MoneyDisplay component**

This component wraps any monetary value and respects the existing PrivacyContext.

```tsx
"use client";

import { usePrivacy } from "@/components/context/PrivacyContext";

interface MoneyDisplayProps {
  value: number;
  currency?: "USD" | "BRL";
  showSign?: boolean;
  className?: string;
  colorize?: boolean; // green for positive, red for negative
}

export function MoneyDisplay({
  value,
  currency = "USD",
  showSign = false,
  className = "",
  colorize = false,
}: MoneyDisplayProps) {
  const { hidden } = usePrivacy();

  if (hidden) {
    return <span className={className}>$•••••</span>;
  }

  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  const sign = value >= 0 ? "+" : "-";
  const display = showSign ? `${sign}${formatted}` : (value < 0 ? `-${formatted}` : formatted);

  const colorClass = colorize
    ? value >= 0
      ? "text-emerald-500"
      : "text-red-500"
    : "";

  return <span className={`${colorClass} ${className}`}>{display}</span>;
}
```

- [ ] **Step 2: Verify PrivacyContext exists and has `hidden` property**

Read `components/context/PrivacyContext.tsx` to confirm the interface. The dashboard page already uses `usePrivacy()`. If the property is named differently (e.g., `isPrivate`, `mask`), update MoneyDisplay accordingly.

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: PASS with no TS errors

- [ ] **Step 4: Commit**

```bash
git add components/ui/MoneyDisplay.tsx
git commit -m "feat: add MoneyDisplay component with privacy-aware value masking"
```

### Task 2: Global Value Toggle in AppHeader

**Files:**
- Modify: `components/layout/AppHeader.tsx`

- [ ] **Step 1: Read AppHeader.tsx**

Read `components/layout/AppHeader.tsx` to understand current layout. Eye/EyeOff icons are already imported.

- [ ] **Step 2: Add privacy toggle button next to theme toggle**

Add a button that calls `usePrivacy().toggle()` (or equivalent method from PrivacyContext). Use the existing Eye/EyeOff icons. Style as a ghost button matching ThemeToggle.

```tsx
// Add near ThemeToggle:
const { hidden, toggle } = usePrivacy();
// ...
<button
  onClick={toggle}
  className="rounded-full p-2 hover:bg-muted transition-colors"
  title={hidden ? "Mostrar valores" : "Ocultar valores"}
>
  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
```

- [ ] **Step 3: Verify AppHeader is inside PrivacyProvider**

Check `app/app/layout.tsx` or wherever PrivacyProvider wraps the app. AppHeader must be a child.

- [ ] **Step 4: Build + visual verification**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/AppHeader.tsx
git commit -m "feat: add global value visibility toggle to navbar"
```

### Task 3: Extend JournalTradeRow Type

**Files:**
- Modify: `components/journal/types.ts`

- [ ] **Step 1: Read types.ts**

Read `components/journal/types.ts` for exact current interface.

- [ ] **Step 2: Add new fields to JournalTradeRow**

```typescript
// Add to existing JournalTradeRow interface:
emotion?: string | null;
discipline?: string | null;
setup_quality?: string | null;
custom_tags?: string[] | null;
entry_rating?: number | null;    // -1, 0, +1
exit_rating?: number | null;     // -1, 0, +1
management_rating?: number | null; // -1, 0, +1
mfe_usd?: number | null;
mae_usd?: number | null;
```

- [ ] **Step 3: Build to verify no type conflicts**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/journal/types.ts
git commit -m "feat: extend JournalTradeRow with psychology and MFE/MAE fields"
```

### Task 4: Database Migrations

**Files:**
- No file changes — run SQL in Supabase dashboard

- [ ] **Step 1: Run ALTER TABLE for journal_trades new columns**

Execute in Supabase SQL editor:

```sql
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS emotion TEXT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS discipline TEXT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS setup_quality TEXT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS custom_tags TEXT[];
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS entry_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS exit_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS management_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS mfe_usd NUMERIC;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS mae_usd NUMERIC;
```

- [ ] **Step 2: Add dashboard_layout to profiles**

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dashboard_layout JSONB;
```

- [ ] **Step 3: Create macro_events table**

```sql
CREATE TABLE IF NOT EXISTS macro_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  event_name TEXT NOT NULL,
  currency TEXT,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  actual TEXT,
  forecast TEXT,
  previous TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_macro_events_date ON macro_events (date);

ALTER TABLE macro_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read macro events"
  ON macro_events FOR SELECT USING (true);
CREATE POLICY "Service role can insert macro events"
  ON macro_events FOR INSERT WITH CHECK (true);
```

- [ ] **Step 4: Verify columns exist**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'journal_trades'
AND column_name IN ('emotion', 'discipline', 'setup_quality', 'custom_tags', 'entry_rating', 'exit_rating', 'management_rating', 'mfe_usd', 'mae_usd');
```

Expected: 9 rows returned.

- [ ] **Step 5: Commit a note documenting the migration**

Create `docs/migrations/2026-03-18-phase3-columns.sql` with the SQL above for reference.

```bash
git add docs/migrations/2026-03-18-phase3-columns.sql
git commit -m "docs: add Phase 3 database migration reference"
```

---

## Phase 3.2 — Reports & Analytics

### Task 5: Trade Analytics Library

**Files:**
- Create: `lib/trade-analytics.ts`

- [ ] **Step 1: Define the TradeAnalytics interface**

```typescript
import { JournalTradeRow } from "@/components/journal/types";

export interface TradeAnalytics {
  // Performance
  totalPnl: number;
  netPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number;
  largestWin: number;
  largestLoss: number;

  // Risk
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  kellyCriterion: number;
  recoveryFactor: number;

  // Consistency
  bestDay: { date: string; pnl: number };
  worstDay: { date: string; pnl: number };
  currentStreak: { type: "win" | "loss"; count: number };
  maxWinStreak: number;
  maxLossStreak: number;
  dailyStdDev: number;
  avgTradeDuration: number; // minutes
  tradesPerWeek: number;

  // Curves
  equityCurve: { date: string; equity: number }[];
  drawdownCurve: { date: string; drawdown: number }[];
  dailyPnl: { date: string; pnl: number }[];

  // Breakdowns
  bySymbol: { symbol: string; pnl: number; trades: number; winRate: number; avgPnl: number }[];
  byDirection: { direction: string; pnl: number; trades: number; winRate: number }[];
  byDayOfWeek: { day: string; dayIndex: number; pnl: number; trades: number; winRate: number }[];
  bySession: { session: string; pnl: number; trades: number; winRate: number }[];
  byHour: { hour: number; pnl: number; trades: number; winRate: number }[];
}
```

- [ ] **Step 2: Implement computeTradeAnalytics function**

```typescript
export function computeTradeAnalytics(trades: JournalTradeRow[]): TradeAnalytics {
  // ... implementation of all metrics
  // See spec for formulas: docs/research-phase3-features.md
}
```

Implementation details for each metric group:

**Performance metrics:** Filter trades by `pnl_usd > 0` (wins) and `pnl_usd < 0` (losses). Sum, average, count. Profit factor = `sumWins / Math.abs(sumLosses)`. Expectancy = `(winRate * avgWin) - (lossRate * Math.abs(avgLoss))`.

**Risk metrics:**
- Group trades by date (`closed_at`), sum PnL per day → `dailyPnl[]`
- Sharpe: `(mean(dailyPnl) / stddev(dailyPnl)) * Math.sqrt(252)`
- Sortino: same but stddev only of negative days
- Max drawdown: running peak of equity curve, largest peak-to-trough
- Calmar: `(annualizedReturn / Math.abs(maxDrawdown))`
- Kelly: `winRate - (lossRate / payoffRatio)`, capped at 0.5 (half-Kelly)
- Recovery factor: `netPnl / Math.abs(maxDrawdown)`

**Consistency:** Streak counting by iterating trades sorted by `closed_at`. Avg duration from `closed_at - opened_at` in minutes.

**Curves:** Equity curve = running sum of `net_pnl_usd`. Drawdown = equity - peak at each point.

**Breakdowns:** Group by field, compute stats per group. Session mapping: hour of `opened_at` UTC → Tokyo (0-8), London (8-14), NY (14-21), Other.

Helper functions needed:
- `stddev(values: number[]): number`
- `getSession(hourUtc: number): string`
- `getDayOfWeek(date: string): string`
- `groupTradesByDate(trades: JournalTradeRow[]): Map<string, JournalTradeRow[]>`

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Manual verification**

Import the function in a temporary test or console.log in the dashboard page to verify it computes reasonable values with existing trade data.

- [ ] **Step 5: Commit**

```bash
git add lib/trade-analytics.ts
git commit -m "feat: add trade analytics library with 17+ metrics computation"
```

### Task 6: MetricCard Component

**Files:**
- Create: `components/reports/MetricCard.tsx`

- [ ] **Step 1: Create MetricCard**

```tsx
"use client";

import { MoneyDisplay } from "@/components/ui/MoneyDisplay";

interface MetricCardProps {
  label: string;
  value: number | string;
  format?: "currency" | "percent" | "number" | "ratio" | "duration";
  description?: string;
  colorize?: boolean;
}

export function MetricCard({ label, value, format = "number", description, colorize = false }: MetricCardProps) {
  // Render based on format type
  // Use MoneyDisplay for currency format
  // Use rounded-[22px] card style with inline bg
  // Include subtle description text below value
}
```

Follow existing card patterns:
- `rounded-[22px]`
- `style={{ backgroundColor: "hsl(var(--card))" }}`
- `shadow-soft dark:shadow-soft-dark`
- Label: `text-xs text-muted-foreground uppercase tracking-wider`
- Value: `text-2xl font-semibold tracking-tight`

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/reports/MetricCard.tsx
git commit -m "feat: add MetricCard component for reports page"
```

### Task 7: Chart Components

**Files:**
- Create: `components/reports/EquityCurve.tsx`
- Create: `components/reports/DrawdownChart.tsx`
- Create: `components/reports/PnlDistribution.tsx`
- Create: `components/reports/DailyPnlChart.tsx`

- [ ] **Step 1: Create EquityCurve**

Recharts `LineChart` component. X-axis: date. Y-axis: cumulative PnL. Green line. Responsive. Uses `MoneyDisplay` for tooltip values.

Reference existing Recharts usage in the codebase for consistent styling (colors, fonts, responsive container pattern).

```tsx
"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface EquityCurveProps {
  data: { date: string; equity: number }[];
}

export function EquityCurve({ data }: EquityCurveProps) {
  // ResponsiveContainer with LineChart
  // Green (#10b981) line for equity
  // Custom tooltip showing date + formatted value
  // Hide grid, minimal axis labels
}
```

- [ ] **Step 2: Create DrawdownChart**

Recharts `AreaChart` (inverted). Red fill for drawdown area. Same axis pattern.

- [ ] **Step 3: Create PnlDistribution**

Recharts `BarChart` as histogram. Bucket PnL values into ranges. Green bars for positive buckets, red for negative.

- [ ] **Step 4: Create DailyPnlChart**

Recharts `BarChart`. X-axis: date. Y-axis: daily PnL. Green/red bars.

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add components/reports/EquityCurve.tsx components/reports/DrawdownChart.tsx components/reports/PnlDistribution.tsx components/reports/DailyPnlChart.tsx
git commit -m "feat: add chart components for reports page (equity, drawdown, distribution, daily PnL)"
```

### Task 8: Breakdown Charts

**Files:**
- Create: `components/reports/BreakdownCharts.tsx`

- [ ] **Step 1: Create BreakdownCharts**

Single file with multiple exported components:
- `SymbolBreakdown` — horizontal BarChart by symbol
- `DirectionBreakdown` — Long vs Short grouped bars
- `DayOfWeekBreakdown` — Bar chart Mon-Fri
- `SessionBreakdown` — Bar chart Tokyo/London/NY/Other
- `HourHeatmap` — 24-cell heatmap of PnL by hour

Each receives typed props from TradeAnalytics breakdowns.

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/reports/BreakdownCharts.tsx
git commit -m "feat: add breakdown chart components (symbol, direction, day, session, hour)"
```

### Task 9: Reports Page

**Files:**
- Create: `app/app/reports/page.tsx`

- [ ] **Step 1: Create Reports page with tabs**

```tsx
"use client";

import { useState, useMemo } from "react";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { createClient } from "@/lib/supabase/client";
import { computeTradeAnalytics } from "@/lib/trade-analytics";
import { MetricCard } from "@/components/reports/MetricCard";
import { EquityCurve } from "@/components/reports/EquityCurve";
import { DrawdownChart } from "@/components/reports/DrawdownChart";
import { PnlDistribution } from "@/components/reports/PnlDistribution";
import { DailyPnlChart } from "@/components/reports/DailyPnlChart";
import { SymbolBreakdown, DirectionBreakdown, DayOfWeekBreakdown, SessionBreakdown, HourHeatmap } from "@/components/reports/BreakdownCharts";
// Tabs: shadcn Tabs component

export default function ReportsPage() {
  // Period selector: 7d, 30d, 90d, YTD, All, Custom
  // Account selector from useActiveAccount
  // Fetch trades for selected period
  // Compute analytics with useMemo
  // Tabs: Overview | Breakdowns | MFE/MAE | Psicologia
  // Overview: MetricCard grid (3 groups) + Charts
  // Breakdowns: BreakdownCharts components
  // MFE/MAE: placeholder for Phase 3.5
  // Psicologia: placeholder for Phase 3.3
}
```

Layout:
- `mx-auto max-w-6xl px-6 py-10`
- h1: "Relatórios" with subtitle
- Period selector as pill buttons (`rounded-full`)
- Metric cards in responsive grid (3-4 cols)
- Charts below in 2-col grid

- [ ] **Step 2: Add link to Reports in AppHeader/Sidebar navigation**

Add "Relatórios" link to the app navigation. Read current nav structure first.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Visual verification with Playwright**

Navigate to `/app/reports`, verify metrics render, charts display, tabs switch.

- [ ] **Step 5: Commit**

```bash
git add app/app/reports/page.tsx
git commit -m "feat: add Reports page with metrics overview and breakdown tabs"
```

---

## Phase 3.3 — Psychology Tags

### Task 10: Psychology Tags Library

**Files:**
- Create: `lib/psychology-tags.ts`

- [ ] **Step 1: Create tag definitions and Tiltmeter logic**

```typescript
export interface TagDefinition {
  key: string;
  label: string;
  labelPtBr: string;
  sentiment: -1 | 0 | 1;
  icon?: string;
}

export const EMOTION_TAGS: TagDefinition[] = [
  { key: "confident", label: "Confident", labelPtBr: "Confiante", sentiment: 1, icon: "😎" },
  { key: "calm", label: "Calm", labelPtBr: "Calmo", sentiment: 1, icon: "🧘" },
  { key: "focused", label: "Focused", labelPtBr: "Focado", sentiment: 1, icon: "🎯" },
  { key: "neutral", label: "Neutral", labelPtBr: "Neutro", sentiment: 0, icon: "😐" },
  { key: "anxious", label: "Anxious", labelPtBr: "Ansioso", sentiment: -1, icon: "😰" },
  { key: "fearful", label: "Fearful", labelPtBr: "Com Medo", sentiment: -1, icon: "😨" },
  { key: "fud", label: "FUD", labelPtBr: "FUD", sentiment: -1, icon: "😱" },
  { key: "fomo", label: "FOMO", labelPtBr: "FOMO", sentiment: -1, icon: "🏃" },
  { key: "revenge", label: "Revenge", labelPtBr: "Revenge", sentiment: -1, icon: "😤" },
  { key: "frustrated", label: "Frustrated", labelPtBr: "Frustrado", sentiment: -1, icon: "😣" },
  { key: "greedy", label: "Greedy", labelPtBr: "Ganancioso", sentiment: -1, icon: "🤑" },
  { key: "impatient", label: "Impatient", labelPtBr: "Impaciente", sentiment: -1, icon: "⏰" },
  { key: "bored", label: "Bored", labelPtBr: "Entediado", sentiment: -1, icon: "🥱" },
  { key: "euphoric", label: "Euphoric", labelPtBr: "Eufórico", sentiment: -1, icon: "🤩" },
];

export const DISCIPLINE_TAGS: TagDefinition[] = [
  { key: "followed_plan", label: "Followed Plan", labelPtBr: "Seguiu o plano", sentiment: 1, icon: "✅" },
  { key: "perfect_execution", label: "Perfect Execution", labelPtBr: "Execução perfeita", sentiment: 1, icon: "💎" },
  { key: "early_entry", label: "Early Entry", labelPtBr: "Entrada antecipada", sentiment: -1, icon: "⏩" },
  { key: "late_entry", label: "Late Entry", labelPtBr: "Entrada atrasada", sentiment: -1, icon: "⏪" },
  { key: "early_exit", label: "Early Exit", labelPtBr: "Saída antecipada", sentiment: -1, icon: "🚪" },
  { key: "late_exit", label: "Late Exit", labelPtBr: "Segurou demais", sentiment: -1, icon: "⏳" },
  { key: "moved_stop", label: "Moved Stop", labelPtBr: "Moveu o stop", sentiment: -1, icon: "🔄" },
  { key: "no_stop", label: "No Stop Loss", labelPtBr: "Sem stop loss", sentiment: -1, icon: "🚫" },
  { key: "oversized", label: "Oversized", labelPtBr: "Posição grande demais", sentiment: -1, icon: "📈" },
  { key: "undersized", label: "Undersized", labelPtBr: "Posição pequena demais", sentiment: -1, icon: "📉" },
  { key: "revenge_trade", label: "Revenge Trade", labelPtBr: "Revenge trade", sentiment: -1, icon: "🔥" },
  { key: "fomo_trade", label: "FOMO Trade", labelPtBr: "FOMO trade", sentiment: -1, icon: "🏃" },
  { key: "overtraded", label: "Overtraded", labelPtBr: "Overtrading", sentiment: -1, icon: "♻️" },
  { key: "break_rules", label: "Broke Rules", labelPtBr: "Quebrou regras", sentiment: -1, icon: "⚠️" },
];

export const SETUP_QUALITY = [
  { key: "a_plus", label: "A+", description: "Setup perfeito" },
  { key: "a", label: "A", description: "Bom setup" },
  { key: "b", label: "B", description: "Setup ok" },
  { key: "c", label: "C", description: "Setup fraco" },
];

export interface TiltmeterResult {
  score: number;        // -1.0 to 1.0
  zone: "green" | "yellow" | "red";
  label: string;
}

export function computeTiltmeter(
  trades: { emotion?: string | null; discipline?: string | null; entry_rating?: number | null; exit_rating?: number | null; management_rating?: number | null }[],
  windowSize: number = 10
): TiltmeterResult {
  const recent = trades.slice(-windowSize);
  if (recent.length === 0) return { score: 0, zone: "yellow", label: "Sem dados" };

  let totalScore = 0;
  let count = 0;

  for (const t of recent) {
    let tradeScore = 0;
    let components = 0;

    // Emotion score
    if (t.emotion) {
      const tag = EMOTION_TAGS.find(e => e.key === t.emotion);
      if (tag) { tradeScore += tag.sentiment; components++; }
    }

    // Discipline score
    if (t.discipline) {
      const tag = DISCIPLINE_TAGS.find(d => d.key === t.discipline);
      if (tag) { tradeScore += tag.sentiment; components++; }
    }

    // Sub-ratings
    const ratings = [t.entry_rating, t.exit_rating, t.management_rating].filter(r => r != null) as number[];
    if (ratings.length > 0) {
      tradeScore += ratings.reduce((a, b) => a + b, 0) / ratings.length;
      components++;
    }

    if (components > 0) {
      totalScore += tradeScore / components;
      count++;
    }
  }

  const score = count > 0 ? totalScore / count : 0;
  const zone = score > 0.3 ? "green" : score < -0.3 ? "red" : "yellow";
  const label = zone === "green" ? "Tilt-free" : zone === "red" ? "On Tilt" : "Atenção";

  return { score: Math.round(score * 100) / 100, zone, label };
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/psychology-tags.ts
git commit -m "feat: add psychology tags definitions and Tiltmeter computation"
```

### Task 11: PsychologySection Component

**Files:**
- Create: `components/journal/PsychologySection.tsx`
- Modify: `components/journal/TradeDetailModal.tsx`

- [ ] **Step 1: Read TradeDetailModal.tsx**

Read full file to understand current state management, save pattern, and layout.

- [ ] **Step 2: Create PsychologySection**

```tsx
"use client";

import { EMOTION_TAGS, DISCIPLINE_TAGS, SETUP_QUALITY } from "@/lib/psychology-tags";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThumbsDown, Minus, ThumbsUp } from "lucide-react";

interface PsychologySectionProps {
  emotion: string | null;
  setEmotion: (v: string | null) => void;
  discipline: string | null;
  setDiscipline: (v: string | null) => void;
  setupQuality: string | null;
  setSetupQuality: (v: string | null) => void;
  entryRating: number | null;
  setEntryRating: (v: number | null) => void;
  exitRating: number | null;
  setExitRating: (v: number | null) => void;
  managementRating: number | null;
  setManagementRating: (v: number | null) => void;
  customTags: string[];
  setCustomTags: (v: string[]) => void;
}

export function PsychologySection(props: PsychologySectionProps) {
  // Emotion dropdown with icons
  // Discipline dropdown with icons
  // Setup quality radio buttons (A+ / A / B / C)
  // Sub-ratings: 3 rows (Entry / Exit / Management) each with 👎/😐/👍 toggle
  // Custom tags: input + enter to add, badges with X to remove
}
```

- [ ] **Step 3: Integrate PsychologySection into TradeDetailModal**

Add state hooks for all new fields. Initialize from trade data. Include in save mutation. Add the section below existing fields with a "Psicologia" heading.

- [ ] **Step 4: Update save mutation to persist new fields**

The Supabase update call needs to include: `emotion, discipline, setup_quality, custom_tags, entry_rating, exit_rating, management_rating`.

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add components/journal/PsychologySection.tsx components/journal/TradeDetailModal.tsx
git commit -m "feat: add psychology tags UI to trade detail modal"
```

### Task 12: TiltmeterGauge Widget

**Files:**
- Create: `components/dashboard/TiltmeterGauge.tsx`

- [ ] **Step 1: Create Tiltmeter gauge**

Visual arc/gauge component showing tilt score. Colors: green/yellow/red zones. Uses Framer Motion for animation. Shows score number + label text.

Design: Semi-circular gauge (SVG arc), score in center, colored by zone. Compact enough for dashboard widget.

```tsx
"use client";

import { motion } from "framer-motion";
import { TiltmeterResult } from "@/lib/psychology-tags";

interface TiltmeterGaugeProps {
  result: TiltmeterResult;
  size?: "sm" | "md";
}

export function TiltmeterGauge({ result, size = "md" }: TiltmeterGaugeProps) {
  // SVG semi-circle arc
  // Needle position based on score (-1 to +1 mapped to 0-180 degrees)
  // Color zones: red (0-60°), yellow (60-120°), green (120-180°)
  // Center text: score + label
  // Framer Motion animate needle position
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/TiltmeterGauge.tsx
git commit -m "feat: add Tiltmeter gauge widget component"
```

### Task 13: Psychology Analytics in Reports

**Files:**
- Create: `components/reports/PsychologyAnalytics.tsx`

- [ ] **Step 1: Create psychology analytics charts**

Charts:
- Win rate by emotion (horizontal bar chart)
- Avg PnL by emotion (horizontal bar chart)
- Discipline distribution (pie/donut chart)
- Mistake cost table (tag → count → total $ lost)
- Setup quality vs outcome (grouped bar chart)
- Tiltmeter trend over time (line chart of rolling tilt score)

- [ ] **Step 2: Integrate into Reports page Psicologia tab**

Update `app/app/reports/page.tsx` to render PsychologyAnalytics in the "Psicologia" tab. Pass trades with psychology data.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/reports/PsychologyAnalytics.tsx app/app/reports/page.tsx
git commit -m "feat: add psychology analytics tab to Reports page"
```

### Task 14: Psychology Badges in Journal List

**Files:**
- Modify: `app/app/journal/page.tsx`

- [ ] **Step 1: Read journal page**

Read `app/app/journal/page.tsx` to find where trades are listed.

- [ ] **Step 2: Add emotion + discipline badges to trade rows**

Show small colored badges next to each trade in the list. Emotion tag with icon, discipline tag with icon. Only show if set.

- [ ] **Step 3: Add Tiltmeter at top of journal page**

Compute tiltmeter from visible trades, show TiltmeterGauge in compact mode at the top of the page.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/app/journal/page.tsx
git commit -m "feat: show psychology badges on journal trades + Tiltmeter at top"
```

---

## Phase 3.4 — AI Q&A on Trader Data

### Task 15: Extend AI Prompts with Analytics Context

**Files:**
- Modify: `lib/ai-prompts.ts`
- Modify: `lib/ai-stats.ts`

- [ ] **Step 1: Read current ai-prompts.ts and ai-stats.ts**

Read both files completely to understand current prompt structure and stats computation.

- [ ] **Step 2: Add TradeAnalytics to prompt context**

Extend `PromptContext` interface to accept `analytics?: TradeAnalytics`. Add new formatter function `formatTradeAnalytics(analytics: TradeAnalytics): string` that produces a markdown block with all metrics for Claude's context.

- [ ] **Step 3: Add Psychology context to prompts**

Add `psychologyProfile` to PromptContext. Formatter: `formatPsychologyProfile(trades)` that computes emotion distribution, discipline distribution, tilt score, win rate by emotion — as markdown for the prompt.

- [ ] **Step 4: Update system prompt instructions**

Add to SYSTEM_BASE:
```
- You have access to the trader's complete analytics. Always cite specific numbers.
- Never invent data. If data is insufficient, say so.
- Cross-reference macro events with trading performance when relevant.
- Provide actionable insights, not just observations.
- When discussing emotions/discipline, be supportive, not judgmental.
```

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add lib/ai-prompts.ts lib/ai-stats.ts
git commit -m "feat: extend AI prompts with trade analytics and psychology context"
```

### Task 16: Macro Events API

**Files:**
- Create: `app/api/macro-calendar/route.ts`
- Create: `lib/macro-events.ts`

- [ ] **Step 1: Create macro-events.ts**

Types and correlation logic:

```typescript
export interface MacroEvent {
  date: string;
  event_name: string;
  currency: string | null;
  impact: "high" | "medium" | "low";
}

export interface MacroCorrelation {
  event: string;
  traderPnl: number;
  traderWinRate: number;
  tradeCount: number;
}

export function correlateMacroWithTrades(
  events: MacroEvent[],
  dailyPnl: { date: string; pnl: number; trades: number; wins: number }[]
): MacroCorrelation[] {
  // For each high-impact event, find the trader's PnL in that week
  // Return correlation data
}
```

- [ ] **Step 2: Create macro-calendar API route**

Fetch events from a free source (Forex Factory RSS or similar). Cache in `macro_events` table. Return recent events.

```typescript
// app/api/macro-calendar/route.ts
// GET: returns macro events for a date range
// Fetches from external source, upserts into macro_events table
// Bearer token auth pattern (same as other API routes)
```

- [ ] **Step 3: Add macro context to AI prompts**

Add `macroContext?: string` to PromptContext. Format macro correlations as markdown for Claude.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add lib/macro-events.ts app/api/macro-calendar/route.ts lib/ai-prompts.ts
git commit -m "feat: add macro events API and correlation for AI Q&A"
```

### Task 17: AI Coach Q&A Quick Actions

**Files:**
- Modify: `app/app/ai-coach/page.tsx`

- [ ] **Step 1: Read AI Coach page**

Read `app/app/ai-coach/page.tsx` for current quick action implementation.

- [ ] **Step 2: Add "Analisar Meus Dados" quick action**

New button that, when clicked:
1. Computes `TradeAnalytics` from current account trades
2. Computes psychology profile
3. Fetches macro correlation
4. Sends to AI with enriched context

- [ ] **Step 3: Add insight quick-action buttons**

When "Analisar Meus Dados" mode is active, show sub-buttons:
- "Qual meu melhor par?"
- "Qual meu pior horário?"
- "Como está minha disciplina?"
- "Resumo da semana"
- "O que posso melhorar?"
- "Como me saio em semanas de notícia?"

Each pre-fills a message that gets sent with full analytics context.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/app/ai-coach/page.tsx
git commit -m "feat: add AI Q&A quick actions with data analysis and macro correlation"
```

---

## Phase 3.5 — MFE/MAE Analysis

### Task 18: MFE/MAE Fields in TradeDetailModal

**Files:**
- Modify: `components/journal/TradeDetailModal.tsx`

- [ ] **Step 1: Add MFE/MAE input fields**

Add two numeric input fields below PnL section: "MFE ($)" and "MAE ($)". Optional, nullable. Include help tooltip explaining what MFE/MAE means.

State hooks:
```tsx
const [mfeUsd, setMfeUsd] = useState<number | null>(trade.mfe_usd ?? null);
const [maeUsd, setMaeUsd] = useState<number | null>(trade.mae_usd ?? null);
```

Include in save mutation.

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/journal/TradeDetailModal.tsx
git commit -m "feat: add MFE/MAE input fields to trade detail modal"
```

### Task 19: MFE/MAE Scatter Plot Component

**Files:**
- Create: `components/reports/MfeMaeScatter.tsx`

- [ ] **Step 1: Create scatter plot components**

```tsx
"use client";

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { JournalTradeRow } from "@/components/journal/types";

interface MfeMaeScatterProps {
  trades: JournalTradeRow[];
  type: "mae-vs-pnl" | "mfe-vs-pnl";
}

export function MfeMaeScatter({ trades, type }: MfeMaeScatterProps) {
  // Filter trades that have mfe_usd/mae_usd data
  // Show empty state if < 10 trades with data
  // Scatter plot: each dot = trade
  // Color: green (#10b981) for wins, red (#ef4444) for losses
  // Badge: "X de Y trades com dados de excursão"
}

interface ExitEfficiencyProps {
  trades: JournalTradeRow[];
}

export function ExitEfficiencyChart({ trades }: ExitEfficiencyProps) {
  // Line chart: trade number (chronological) vs PnL/MFE ratio
  // Only winning trades with mfe_usd > 0
  // Rolling average line overlay
}
```

- [ ] **Step 2: Integrate into Reports MFE/MAE tab**

Update `app/app/reports/page.tsx`: render MfeMaeScatter and ExitEfficiencyChart in "MFE/MAE" tab. Show derived metrics (avg exit efficiency, optimal stop, left on table) as MetricCards above charts.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/reports/MfeMaeScatter.tsx app/app/reports/page.tsx
git commit -m "feat: add MFE/MAE scatter plots and exit efficiency chart to Reports"
```

---

## Phase 3.6 — Customizable Dashboard

### Task 20: Widget System

**Files:**
- Create: `components/dashboard/WidgetRenderer.tsx`

- [ ] **Step 1: Define widget registry**

```typescript
"use client";

import { ComponentType } from "react";

export interface DashboardWidgetDef {
  id: string;
  title: string;
  titlePtBr: string;
  component: ComponentType<any>;
  tier: "free" | "pro" | "plus";
  defaultVisible: boolean;
  defaultOrder: number;
}

export interface DashboardLayout {
  widgets: { id: string; visible: boolean; order: number }[];
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "kpi", visible: true, order: 0 },
    { id: "accounts", visible: true, order: 1 },
    { id: "calendar", visible: true, order: 2 },
    { id: "news", visible: true, order: 3 },
    { id: "equity-mini", visible: false, order: 4 },
    { id: "tiltmeter", visible: false, order: 5 },
    { id: "top-symbols", visible: false, order: 6 },
    { id: "session-heatmap", visible: false, order: 7 },
    { id: "streaks", visible: false, order: 8 },
    { id: "ai-insight", visible: false, order: 9 },
  ],
};
```

- [ ] **Step 2: Create WidgetRenderer**

Receives `layout: DashboardLayout`, `subscription tier`, and renders visible widgets in order. Non-visible widgets hidden. Locked widgets (tier too low) show PaywallGate overlay.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/WidgetRenderer.tsx
git commit -m "feat: add widget registry and renderer for customizable dashboard"
```

### Task 21: New Dashboard Widgets

**Files:**
- Create: `components/dashboard/EquityCurveMini.tsx`
- Create: `components/dashboard/SessionHeatmap.tsx`

- [ ] **Step 1: Create EquityCurveMini**

Compact sparkline version of equity curve. No axis labels, just the line with start/end values. Card container with title.

- [ ] **Step 2: Create SessionHeatmap**

3x1 grid (Tokyo/London/NY) showing PnL and win rate per session. Color-coded cells. Compact card.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/EquityCurveMini.tsx components/dashboard/SessionHeatmap.tsx
git commit -m "feat: add mini equity curve and session heatmap dashboard widgets"
```

### Task 22: Dashboard Layout Settings

**Files:**
- Modify: `app/app/settings/page.tsx`

- [ ] **Step 1: Read settings page**

Read `app/app/settings/page.tsx` for current structure.

- [ ] **Step 2: Add Dashboard section**

New section "Dashboard" with:
- Checkbox per widget (show/hide)
- Drag handles for reorder (use simple sortable — no new dependency, just move up/down buttons)
- Save button that persists to `profiles.dashboard_layout`

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/app/settings/page.tsx
git commit -m "feat: add dashboard layout customization to settings page"
```

### Task 23: Integrate Widget System into Dashboard

**Files:**
- Modify: `app/app/page.tsx`

- [ ] **Step 1: Read dashboard page**

Read `app/app/page.tsx` for current widget layout.

- [ ] **Step 2: Replace hardcoded widgets with WidgetRenderer**

Load `dashboard_layout` from user profile. Fall back to `DEFAULT_LAYOUT`. Pass to `WidgetRenderer` which renders visible widgets in order.

Wrap existing components (JournalBriefing, AccountsOverview, CalendarPnl, NewsSection) as registered widgets. Add new widgets (TiltmeterGauge, EquityCurveMini, SessionHeatmap).

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Visual verification with Playwright**

Navigate to `/app`, verify widgets render in correct order. Toggle some widgets in settings, verify dashboard updates.

- [ ] **Step 5: Commit**

```bash
git add app/app/page.tsx
git commit -m "feat: integrate customizable widget system into dashboard"
```

---

## Final Steps

### Task 24: Migrate AccountsOverview to MoneyDisplay

**Files:**
- Modify: `components/dashboard/AccountsOverview.tsx`

- [ ] **Step 1: Read AccountsOverview**

- [ ] **Step 2: Replace local `formatCurrency(value, mask)` with `<MoneyDisplay value={value} />`**

Remove the local mask logic. MoneyDisplay handles it via PrivacyContext.

- [ ] **Step 3: Build + verify**

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/AccountsOverview.tsx
git commit -m "refactor: migrate AccountsOverview to global MoneyDisplay component"
```

### Task 25: End-to-End Verification

- [ ] **Step 1: Full build**

```bash
npm run build
```

- [ ] **Step 2: Visual verification via Playwright**

Verify all pages:
1. Dashboard — widgets render, tiltmeter shows, value toggle works
2. Journal — psychology badges visible, trade modal has psychology section
3. Reports — all tabs render, charts display, metrics are reasonable
4. AI Coach — new quick actions visible, "Analisar Meus Dados" works
5. Settings — dashboard customization section works
6. Value toggle — hides values on all pages

- [ ] **Step 3: Final commit if any fixes needed**

- [ ] **Step 4: Push to deploy**

```bash
git push
```
