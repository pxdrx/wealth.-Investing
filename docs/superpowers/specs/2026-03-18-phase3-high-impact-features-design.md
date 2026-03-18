# Phase 3 — High Impact Features — Design Spec

> **Date:** 2026-03-18
> **Status:** Approved (with reviewer fixes applied)
> **Author:** Claude (brainstorming session with user)

---

## Overview

Phase 3 adds 5 high-impact features to the wealth.Investing trading dashboard, prioritized by implementation order:

1. **D — Reports & Analytics** (17+ metrics, equity curve, breakdowns)
2. **A — Psychology Tags** (emotion/discipline tagging per trade, Tiltmeter)
3. **B — AI Q&A on Trader Data** (natural language queries + macro correlation)
4. **C — MFE/MAE Analysis** (Maximum Favorable/Adverse Excursion)
5. **E — Customizable Dashboard** (widget toggle + reorder)

**Cross-feature requirement:** Global value visibility toggle (hide/show monetary values everywhere).

---

## Architecture Approach: Hybrid

Each feature lives where it makes contextual sense:

| Feature | Location |
|---------|----------|
| Reports & Analytics | New page `/app/reports` |
| Psychology Tags | Inline in Journal (`TradeDetailModal`) + Tiltmeter widget |
| AI Q&A | Extension of existing AI Coach (`/app/ai-coach`) |
| MFE/MAE | Tab within Reports page |
| Dashboard Customizable | Settings toggle + widget system on `/app` |

---

## Cross-Feature: Global Value Visibility Toggle

### Behavior
- Eye icon button (👁️) in the navbar, visible on all authenticated pages
- Toggles ALL monetary values between visible and hidden state
- Hidden format: `$•••••` or `R$ •••••` — preserves layout without revealing values

### Scope
- **Dashboard:** KPI cards, equity curve, calendar PnL, account balances
- **Journal:** PnL per trade, totals, averages
- **Wallet:** Balance, transactions, payouts
- **Reports:** All dollar-denominated metrics
- **AI Coach:** Dollar values in AI responses (best-effort via CSS)

### Implementation
- **Extend existing `PrivacyContext`** (`components/context/PrivacyContext.tsx`) — do NOT create a new context
- Add `localStorage('wealth-hide-values')` persistence to existing PrivacyContext (currently not persisted)
- `<MoneyDisplay value={123.45} />` component that consumes `usePrivacy()` from existing context
- Existing `AccountsOverview` `hidden` boolean migrated to use the global MoneyDisplay

---

## Feature D — Reports & Analytics

### Page Structure
- **Route:** `/app/reports`
- **Layout:** Tabbed interface — Overview | Breakdowns | MFE/MAE (Feature C)
- **Period selector:** 7d, 30d, 90d, YTD, All Time, Custom Range
- **Account selector:** Per account or "All accounts"

### Metrics — Overview Tab

#### Performance Group
| Metric | Formula | Display |
|--------|---------|---------|
| Total PnL | `SUM(net_pnl_usd)` | Currency with +/- color |
| Win Rate | `winning / total` | Percentage with bar |
| Profit Factor | `gross_wins / abs(gross_losses)` | Number (>1.5 good, >2.0 excellent) |
| Expectancy | `(wr × avg_win) - (lr × avg_loss)` | Currency per trade |
| Avg Win | `SUM(winning_pnl) / count(wins)` | Currency |
| Avg Loss | `SUM(losing_pnl) / count(losses)` | Currency |
| Payoff Ratio | `avg_win / abs(avg_loss)` | Ratio |

#### Risk Group
| Metric | Formula | Display |
|--------|---------|---------|
| Max Drawdown | Largest peak-to-trough in cumulative PnL | Currency + % |
| Sharpe Ratio | `(mean_daily_return) / std_dev(daily_returns) × √252` | Number |
| Sortino Ratio | `(mean_daily_return) / std_dev(negative_daily_returns) × √252` | Number |
| Calmar Ratio | `annualized_return / max_drawdown` | Number |
| Kelly Criterion | `wr - (lr / payoff_ratio)` | Percentage (show half-Kelly) |
| Recovery Factor | `net_profit / max_drawdown` | Number |

#### Consistency Group
| Metric | Formula | Display |
|--------|---------|---------|
| Best Day | `MAX(daily_pnl)` | Currency + date |
| Worst Day | `MIN(daily_pnl)` | Currency + date |
| Win Streak (current) | Sequential wins from latest trade | Number |
| Win Streak (max) | Longest sequential wins | Number |
| Loss Streak (max) | Longest sequential losses | Number |
| Std Dev (daily) | `STDDEV(daily_pnl)` | Currency |
| Avg Trade Duration | `AVG(closed_at - opened_at)` | Duration format |
| Trades per Week | `total / weeks_in_period` | Number |

### Charts — Overview Tab
1. **Equity Curve** — Line chart of cumulative `net_pnl_usd` ordered by `closed_at`
2. **Drawdown Chart** — Area chart (inverted) showing distance from equity peak
3. **PnL Distribution** — Histogram of individual trade PnL values
4. **Daily PnL Bar Chart** — Bar chart of net PnL per day

### Breakdowns Tab
1. **By Symbol** — Bar chart + table: PnL, win rate, trade count, avg PnL per symbol
2. **By Direction** — Long vs Short comparison
3. **By Day of Week** — Bar chart showing PnL per weekday
4. **By Session** — Tokyo / London / New York / Other (based on `opened_at` hour UTC)
5. **By Hour** — Heatmap of PnL by hour of day

### Implementation
- **File:** `lib/trade-analytics.ts` — pure functions, all client-side computation
- **Interface:** `TradeAnalytics` containing all metrics above
- **Input:** Array of `JournalTradeRow` (already fetched for 90 days)
- **Components:** `app/app/reports/page.tsx` + `components/reports/*.tsx`
- **Charts:** Recharts (already in stack)
- **No new API routes needed** — all computation from existing trade data

---

## Feature A — Psychology Tags

### Schema Changes (journal_trades)

```sql
ALTER TABLE journal_trades ADD COLUMN emotion TEXT;
ALTER TABLE journal_trades ADD COLUMN discipline TEXT;
ALTER TABLE journal_trades ADD COLUMN setup_quality TEXT;
ALTER TABLE journal_trades ADD COLUMN custom_tags TEXT[];
ALTER TABLE journal_trades ADD COLUMN entry_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN exit_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN management_rating SMALLINT;
```

### Pre-defined Tags

#### Emotions (14)
| Key | Label (pt-BR) | Sentiment |
|-----|---------------|-----------|
| `confident` | Confiante | +1 |
| `calm` | Calmo | +1 |
| `focused` | Focado | +1 |
| `neutral` | Neutro | 0 |
| `anxious` | Ansioso | -1 |
| `fearful` | Com Medo | -1 |
| `fud` | FUD | -1 |
| `fomo` | FOMO | -1 |
| `revenge` | Revenge | -1 |
| `frustrated` | Frustrado | -1 |
| `greedy` | Ganancioso | -1 |
| `impatient` | Impaciente | -1 |
| `bored` | Entediado | -1 |
| `euphoric` | Eufórico | -1 |

#### Discipline (14)
| Key | Label (pt-BR) | Sentiment |
|-----|---------------|-----------|
| `followed_plan` | Seguiu o plano | +1 |
| `perfect_execution` | Execução perfeita | +1 |
| `early_entry` | Entrada antecipada | -1 |
| `late_entry` | Entrada atrasada | -1 |
| `early_exit` | Saída antecipada | -1 |
| `late_exit` | Segurou demais | -1 |
| `moved_stop` | Moveu o stop | -1 |
| `no_stop` | Sem stop loss | -1 |
| `oversized` | Posição grande demais | -1 |
| `undersized` | Posição pequena demais | -1 |
| `revenge_trade` | Revenge trade | -1 |
| `fomo_trade` | FOMO trade | -1 |
| `overtraded` | Overtrading | -1 |
| `break_rules` | Quebrou regras | -1 |

#### Setup Quality
| Key | Label |
|-----|-------|
| `a_plus` | A+ (setup perfeito) |
| `a` | A (bom setup) |
| `b` | B (setup ok) |
| `c` | C (setup fraco) |

### Tiltmeter

**Calculation:**
```
emotion_score = emotion.sentiment  // +1, 0, or -1
discipline_score = discipline.sentiment  // +1 or -1 (no neutral — absence of tag = skip)
sub_ratings_score = (entry_rating + exit_rating + management_rating) / 3  // -1 to +1

// Only average components that are present (handles missing tags gracefully)
trade_tilt = AVG(non-null components of [emotion_score, discipline_score, sub_ratings_score])
rolling_tilt = AVG(last 10 trades' trade_tilt)
```

**Display:**
- Score range: -1.0 to +1.0
- Visual: Gauge/arc component
- 🟢 Green zone (0.3 to 1.0): "Tilt-free — trading well"
- 🟡 Yellow zone (-0.3 to 0.3): "Watch out — mixed signals"
- 🔴 Red zone (-1.0 to -0.3): "On Tilt — consider stopping"

**Location:** Tiltmeter widget on Dashboard + top of Journal page

### UI in TradeDetailModal

New "Psicologia" section below existing fields:
- **Emoção:** Dropdown with colored icons (emoji prefix)
- **Disciplina:** Dropdown with colored icons
- **Setup Quality:** A+ / A / B / C radio buttons
- **Sub-ratings:** Entry / Exit / Management — each a -1/0/+1 toggle (👎/😐/👍)
- **Tags customizadas:** Tag input field (type + Enter to add)

### Psychology Analytics (in Reports page, new tab "Psicologia")
- Win rate by emotion (bar chart)
- Avg PnL by emotion (bar chart)
- Discipline distribution (pie chart)
- Mistake cost analysis (table: tag → count → total $ lost)
- Setup quality vs outcome (grouped bar chart)
- Post-loss behavior pattern (after 2+ losses, what emotions/disciplines appear?)
- Tiltmeter trend over time (line chart)
- Emotion frequency by day of week (heatmap)

---

## Feature B — AI Q&A on Trader Data

### Architecture
- **No new page** — extends existing AI Coach at `/app/ai-coach`
- **New quick action:** "📊 Analisar Meus Dados"
- **Streaming:** Same SSE pattern via `POST /api/ai/coach`

### Context Injection

When "Analisar Meus Dados" is active, the system prompt receives:

```typescript
interface AIQueryContext {
  // From Feature D
  analytics: TradeAnalytics;          // all 17+ metrics
  breakdowns: {
    bySymbol: SymbolStats[];
    byDirection: DirectionStats[];
    byDayOfWeek: DayStats[];
    bySession: SessionStats[];
    byHour: HourStats[];
  };

  // From Feature A (when available)
  psychology: {
    emotionDistribution: Record<string, number>;
    disciplineDistribution: Record<string, number>;
    tiltScore: number;
    winRateByEmotion: Record<string, number>;
    avgPnlByEmotion: Record<string, number>;
    mistakeCost: Record<string, number>;
  };

  // From Feature C (when available)
  excursion: {
    avgExitEfficiency: number;
    avgMae: number;
    avgMfe: number;
    tradesWithData: number;
  };

  // Macro context
  macro: {
    recentEvents: MacroEvent[];       // last 30 days of major events
    weeklyEventCorrelation: {
      event: string;
      traderPnl: number;
      traderWinRate: number;
    }[];
  };
}
```

### Macro Economic Correlation

**Data source:** New `/api/macro-calendar` endpoint (service-role INSERT)
- Forex Factory RSS / Investing.com calendar (free tier)
- Store in new `macro_events` table: `{ date, event_name, currency, impact (high/medium/low), actual, forecast }`
- **Write path:** `/api/macro-calendar` route uses service-role key to INSERT events. Called on-demand when AI Q&A needs macro context (fetches + caches for 24h). No cron needed.
- Correlate trader's daily PnL with macro events in the same week

**Insight examples:**
- "Você perde em média -$820 em semanas de decisão do FOMC"
- "Seu win rate cai 40% em dias de NFP"
- "Em períodos de alta do VIX (>25), seu overtrading aumenta 3x"
- "Seus melhores resultados em ouro coincidem com períodos de tensão geopolítica"

### Quick Action Buttons (Pre-defined Queries)
1. "Qual meu melhor par?" → symbol breakdown
2. "Qual meu pior horário?" → hour breakdown
3. "Como está minha disciplina?" → psychology summary + tilt
4. "Resumo da semana" → weekly metrics + comparison
5. "O que posso melhorar?" → weakness analysis + actionable suggestions
6. "Como me saio em semanas de notícia?" → macro correlation

### Prompt Engineering Updates (lib/ai-prompts.ts)

```
System prompt additions:
- "You have access to the trader's complete analytics. Always cite specific numbers."
- "Never invent data. If data is insufficient, say so."
- "Cross-reference macro events with trading performance when relevant."
- "Provide actionable insights, not just observations."
- "When discussing emotions/discipline, be supportive, not judgmental."
```

### Tier Gating
- **Free:** 5 AI queries/month (no data analysis, just chat)
- **Pro:** 50 queries/month with full data context
- **Plus:** Unlimited queries with data + macro context

---

## Feature C — MFE/MAE Analysis

### Schema Changes (journal_trades)

```sql
ALTER TABLE journal_trades ADD COLUMN mfe_usd NUMERIC;
ALTER TABLE journal_trades ADD COLUMN mae_usd NUMERIC;
```

### Data Population (3 progressive sources)

| Source | When | Automatic |
|--------|------|-----------|
| MT5/cTrader parser | On import, if detailed report includes data | Yes |
| Manual input | Trader edits trade in TradeDetailModal | No |
| OHLC API (future, Phase 4+) | Fetch candles for trade period, calculate | Yes |

### UI — TradeDetailModal
- New fields: "MFE ($)" and "MAE ($)" — numeric inputs, nullable
- Shown below PnL fields
- Help tooltip: "Maximum favorable/adverse price excursion during this trade"

### Visualizations (Reports page → "MFE/MAE" tab)

Only shown when at least 10 trades have MFE/MAE data. Otherwise, shows empty state with explanation + CTA to add data.

1. **MAE vs PnL Scatter Plot**
   - X: MAE ($), Y: Final PnL ($)
   - Color: green (win) / red (loss)
   - Purpose: Identify optimal stop-loss placement
   - Insight: "Most winning trades had MAE < $X"

2. **MFE vs PnL Scatter Plot**
   - X: MFE ($), Y: Final PnL ($)
   - Color: green (win) / red (loss)
   - Purpose: Identify how much profit is "left on the table"
   - Insight: "You capture X% of favorable excursion on average"

3. **Exit Efficiency Timeline**
   - X: Trade number (chronological), Y: PnL/MFE ratio (%)
   - Line chart with rolling average
   - Purpose: Track improvement in exit timing over time

4. **MAE/MFE Distribution**
   - Histogram of MAE and MFE values
   - Purpose: See concentration of excursions

### Derived Metrics
| Metric | Formula | Purpose |
|--------|---------|---------|
| Avg Exit Efficiency | `mean(pnl / mfe)` for wins | How much of the move you capture |
| Avg Stop Efficiency | `mean(mae / abs(pnl))` for losses | How close stop was to MAE |
| Optimal Stop Suggestion | P75 of MAE for winning trades | Data-driven stop-loss level |
| Left on Table | `SUM(mfe - pnl)` for wins | Total unrealized profit |

### Graceful Degradation
- Badge showing "X de Y trades com dados de excursão"
- Charts only render with ≥10 data points
- Empty state with clear explanation of what MFE/MAE is and how to add data

---

## Feature E — Customizable Dashboard

### Approach: Widget Toggle + Reorder (NOT full drag & drop grid)

**Rationale:** Full grid layout (react-grid-layout) adds ~50KB, resize complexity, and mobile breakpoint headaches. Toggle + reorder covers 90% of the use case with 10% of the effort.

### Available Widgets

| Widget | Default On | Tier |
|--------|-----------|------|
| KPI Cards (PnL, Win Rate, Profit Factor) | ✅ | Free |
| Accounts Overview | ✅ | Free |
| Calendar PnL | ✅ | Free |
| News Feed | ✅ | Free |
| Equity Curve (sparkline) | ❌ | Pro |
| Tiltmeter Gauge | ❌ | Pro |
| Top Symbols | ❌ | Pro |
| Session Heatmap | ❌ | Pro |
| Streaks | ❌ | Pro |
| AI Insight do Dia | ❌ | Plus |

### Customization UI
- **Location:** Settings page → new "Dashboard" section
- **Controls:** Checkbox per widget (show/hide) + drag handle for reorder (simple sortable list, not grid)
- **Preview:** Live preview of dashboard layout as user toggles widgets

### Persistence
- New column in `profiles` table: `dashboard_layout JSONB`
- Schema: `{ version: 1, widgets: [{ id: string, visible: boolean, order: number }] }`
- Default layout for new users (the 4 Free widgets)
- Falls back to default if `dashboard_layout` is null

### Widget Component Pattern

```typescript
interface DashboardWidget {
  id: string;
  title: string;
  component: React.ComponentType<WidgetProps>;
  tier: 'free' | 'pro' | 'plus';
  defaultVisible: boolean;
  defaultOrder: number;
}
```

Dashboard page reads `dashboard_layout` from profile, filters by tier, sorts by order, renders visible widgets.

### Tier Gating
- **Free:** 4 fixed widgets, no customization
- **Pro:** All widgets available, toggle + reorder
- **Plus:** All widgets + AI Insight do Dia

---

## New Database Objects Summary

### New Columns on `journal_trades`
```sql
ALTER TABLE journal_trades ADD COLUMN emotion TEXT;
ALTER TABLE journal_trades ADD COLUMN discipline TEXT;
ALTER TABLE journal_trades ADD COLUMN setup_quality TEXT;
ALTER TABLE journal_trades ADD COLUMN custom_tags TEXT[];
ALTER TABLE journal_trades ADD COLUMN entry_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN exit_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN management_rating SMALLINT;
ALTER TABLE journal_trades ADD COLUMN mfe_usd NUMERIC;
ALTER TABLE journal_trades ADD COLUMN mae_usd NUMERIC;
```

### New Column on `profiles`
```sql
ALTER TABLE profiles ADD COLUMN dashboard_layout JSONB;
```

### New Table: `macro_events`
```sql
CREATE TABLE macro_events (
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

-- Index for date range queries
CREATE INDEX idx_macro_events_date ON macro_events (date);

-- RLS: public read (macro data is not user-specific)
ALTER TABLE macro_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read macro events"
  ON macro_events FOR SELECT USING (true);
CREATE POLICY "Service role can insert macro events"
  ON macro_events FOR INSERT WITH CHECK (true);
```

### New Files

| File | Purpose |
|------|---------|
| `lib/trade-analytics.ts` | Extended metrics (consolidates with existing `lib/ai-stats.ts` — reuse shared computations, add new metrics like Sharpe, Sortino, drawdown, Kelly) |
| `lib/psychology-tags.ts` | Tag definitions, Tiltmeter calculation |
| `lib/macro-events.ts` | Macro event fetching and correlation |
| `app/app/reports/page.tsx` | Reports page (tabs: Overview, Breakdowns, MFE/MAE, Psicologia) |
| `components/reports/EquityCurve.tsx` | Equity curve chart |
| `components/reports/DrawdownChart.tsx` | Drawdown area chart |
| `components/reports/PnlDistribution.tsx` | PnL histogram |
| `components/reports/BreakdownCharts.tsx` | Symbol/direction/session/day/hour charts |
| `components/reports/MfeMaeScatter.tsx` | MFE/MAE scatter plots |
| `components/reports/PsychologyAnalytics.tsx` | Psychology breakdown charts |
| `components/reports/MetricCard.tsx` | Reusable metric display card |
| `components/journal/PsychologySection.tsx` | Psychology inputs in TradeDetailModal |
| `components/dashboard/TiltmeterGauge.tsx` | Tiltmeter gauge widget |
| `components/dashboard/EquityCurveMini.tsx` | Sparkline equity curve widget |
| `components/dashboard/WidgetRenderer.tsx` | Widget layout engine |
| `components/ui/MoneyDisplay.tsx` | Value visibility-aware money formatter |
| ~~`components/ui/ValuesVisibilityToggle.tsx`~~ | ~~Eye icon toggle button~~ (NOT needed — toggle added directly in AppHeader using existing PrivacyContext) |

---

## Implementation Order

```
Phase 3.1 — Foundation (cross-cutting)
  ├── Global value visibility toggle (MoneyDisplay + context)
  └── DB migrations (all new columns + macro_events table)

Phase 3.2 — Reports & Analytics (Feature D)
  ├── lib/trade-analytics.ts (all metrics)
  ├── Reports page + Overview tab
  ├── Charts (equity curve, drawdown, distribution)
  └── Breakdowns tab

Phase 3.3 — Psychology Tags (Feature A)
  ├── lib/psychology-tags.ts (definitions + Tiltmeter calc)
  ├── PsychologySection in TradeDetailModal
  ├── Tiltmeter gauge component
  └── Psychology tab in Reports

Phase 3.4 — AI Q&A (Feature B)
  ├── Extend ai-prompts.ts with TradeAnalytics context
  ├── Add psychology context to prompts
  ├── New quick action buttons
  ├── Macro events table + correlation logic
  └── Macro context in AI prompts

Phase 3.5 — MFE/MAE (Feature C)
  ├── MFE/MAE fields in TradeDetailModal
  ├── Scatter plot components
  ├── MFE/MAE tab in Reports
  └── Exit efficiency metrics

Phase 3.6 — Dashboard Customizable (Feature E)
  ├── Widget system + WidgetRenderer
  ├── Dashboard layout settings UI
  ├── New widgets (equity mini, tiltmeter, session heatmap)
  └── Tier gating for widgets
```

---

## Success Criteria

1. **Reports page** shows all 17 metrics correctly with period filtering
2. **Psychology tags** can be added to any trade and Tiltmeter calculates correctly
3. **AI Q&A** answers natural language questions using real trader data with macro correlation
4. **MFE/MAE** scatter plots render when data is available, graceful empty state otherwise
5. **Dashboard** widgets can be toggled on/off and reordered, persisted per user
6. **Value toggle** hides/shows all monetary values globally across all pages
7. **All features** respect tier gating (Free/Pro/Plus)
8. **Build passes** with zero TypeScript errors
9. **Design** follows existing patterns: card-container style, rounded-[22px], inline bg style
