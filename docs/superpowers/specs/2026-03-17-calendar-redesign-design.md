# Calendar Redesign — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Scope:** Dashboard + Journal calendar redesign

---

## 1. Overview

Redesign the trading calendar to match the premium landing page mockup aesthetic (`JournalMockup.tsx`). The calendar becomes a co-protagonist on the Dashboard and gets integrated directly into the Journal's Visao Geral tab.

### Design Reference

- **Target style:** `components/landing/JournalMockup.tsx` — `landing-card` container, window chrome, mono typography, landing color tokens
- **Color logic:** Blue accent at 0.7 opacity for high profit (>400), 0.35 for profit, danger red 0.4 for loss, border color for break-even
- **Typography:** `font-mono`, 8-10px uppercase labels with `tracking-wider`, semibold values
- **Layout:** Card container with `rounded-2xl` (matching `landing-card` class), subtle borders, off-white nested elements

---

## 2. Dashboard Layout (top to bottom)

### 2.1 Watchlist Card (unchanged)
- Existing TradingView iframe card
- No changes — keep as-is at the top of the Dashboard

### 2.2 Calendar Consolidado + Day Detail Panel (NEW — protagonist)

**Container:** `landing-card` style with window chrome dots, `rounded-2xl`, subtle border.

**Structure:** Flex row — calendar (flex-1) + day detail panel (280px) separated by `border-left`.

#### 2.2.1 KPI Strip (inside card, top)
- Title: "Consolidado de Contas" + month/year
- 4 KPI boxes in grid: **P&L Mes**, **Win Rate**, **Trades**, **Dias Operados**
- Style: `bg-tertiary` rounded boxes, mono 8px uppercase label, 14px semibold value

#### 2.2.2 Calendar Grid (left side)
- Month header with prev/next arrows + "P&L: +R$X.XXX"
- Day-of-week headers: D S T Q Q S S
- 7-column grid, `aspect-square` cells with `rounded-lg`
- Each cell shows: day number (10px) + P&L value (7px)
- Color coding per `cellColor()` from JournalMockup:
  - `pnl > 400`: accent at 0.7 opacity (strong blue)
  - `pnl > 0`: accent at 0.35 opacity (light blue)
  - `pnl === 0`: border color (gray)
  - `pnl < 0`: danger at 0.4 opacity (red)
  - `pnl === null` (weekend/no trade): transparent
- Selected day: `border: 1.5px solid` with darker border, `font-bold` day number
- Click on day updates the detail panel (no modal)

#### 2.2.3 Day Detail Panel (right side, 280px)
- **Header:** Day date + total P&L for that day
- **KPIs 2x2 grid:** Trades, Win Rate, Melhor (green), Pior (red)
- **Observacoes:** Day notes from `day_notes` table (read-only display)
- **Toggle: Consolidado / Por conta**
  - Default: "Consolidado" — shows aggregated P&L across all accounts
  - "Por conta": shows breakdown with mini-list of each account + individual P&L
  - Styled as segmented control (active = dark bg + white text, inactive = muted)
- **Execucao rating:** Placeholder UI only — 5 horizontal bars rendered but non-interactive and empty (all light border). The `day_notes` table has no `execution_rating` column yet. This will be enabled in a future migration.
- No tags, setup, or emotion fields (data doesn't exist yet — keep it data-real)

**Data source:** Fetch all individual `journal_trades` rows (not pre-aggregated) across ALL user accounts for the current month. Fields needed: `id, net_pnl_usd, opened_at, account_id, symbol, direction`. Individual rows are required to compute bestTrade/worstTrade per day. Aggregation into `DayData` happens client-side.

**Empty state:** When no day is selected (initial load), show placeholder: "Selecione um dia para ver detalhes." When a selected day has no trades, show zeroed KPIs with "Sem operacoes neste dia."

**Loading state:** Skeleton grid for calendar cells (7x5 gray rounded boxes pulsing). Skeleton boxes for day detail KPIs.

### 2.3 Journal Briefing Card (NEW — premium unique)

A premium "intelligence briefing" card that gives the trader a quick pulse of their trading performance. Combines expanded KPIs, mini equity sparkline, and recent activity into one high-impact component.

**Container:** Separate card below calendar, same `landing-card` style.

**Structure:** Three horizontal sections inside the card.

#### Section A — Performance Pulse (left ~40%)
- **Expanded KPIs** in a compact 2-column layout:
  - P&L Total (month) — large, colored green/red
  - Win Rate % — with mini progress bar
  - Payoff Ratio
  - Expectativa (per trade)
  - Melhor Trade — green value
  - Pior Trade — red value
  - Dias Operados / Dias do Mes
  - Streak Atual — "3W" (3 wins) or "2L" (2 losses), colored. Calculated as consecutive trading days with net positive/negative total P&L. Non-trading days do not break the streak.

#### Section B — Equity Sparkline (center ~30%)
- Mini equity curve (Recharts `<AreaChart>` or SVG sparkline)
- Shows last 30 days of cumulative P&L
- Green fill for positive, subtle grid lines
- No axes labels — just the visual curve with start/end values
- Floating badge showing monthly % change

#### Section C — Recent Activity (right ~30%)
- "Ultimas 5 Trades" — compact list
- Each row: symbol icon/badge, direction arrow (up/down), P&L value, time ago
- Color-coded: green row for profit, red for loss
- Links to Journal for full details

**Data source:** Same `journal_trades` aggregate query as calendar.

### 2.4 News Card (improved)
- Existing News card but with better visual hierarchy
- Keep current API/ISR logic
- Improve: add impact badge colors (High=red, Medium=orange, Low=gray), cleaner typography
- Compact 4-6 headlines with source + time

---

## 3. Journal Layout Changes

### 3.1 Remove Calendar Tab
- Calendar tab removed from Journal's tab bar
- Remaining tabs: Visao Geral, Equity Curve (chart icon), Statistics, Import MT5
- **Important:** Tab index constants (`SECTION_CALENDAR`, `SECTION_STATS`, `SECTION_IMPORT`) must be recalculated after removing the Calendar tab. The calendar integration goes directly into the Overview section's JSX, not as a tab.

### 3.2 Integrate Calendar into Visao Geral
Below existing KPIs and Equity Curve, add the calendar component.

**Same visual design** as Dashboard calendar but:
- Filtered by **active account** (not consolidated)
- No "Consolidado / Por conta" toggle (already per-account)
- Day detail panel shows same data: KPIs, notes, execution rating
- Click on day still updates panel inline (replaces `DayDetailModal`)

### 3.3 Layout Order in Visao Geral
1. Resumo do Periodo (existing KPI cards with period filter)
2. Curva de Equity (existing chart)
3. **Calendario P&L + Day Detail Panel** (new, integrated)

---

## 4. Shared Calendar Component

Create a single reusable component: `CalendarPnl` (replaces current `PnlCalendar`).

### Props Interface
```typescript
interface CalendarPnlProps {
  trades: JournalTrade[];
  accounts?: Account[]; // passed by parent (Dashboard fetches, not the component)
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  showConsolidatedToggle?: boolean; // true for Dashboard, false for Journal
  dayNotes?: Record<string, DayNote>; // keyed by YYYY-MM-DD
}
```

### DayNote Interface
```typescript
interface DayNote {
  observation: string;
  tags: string[] | null;
  // executionRating not yet in DB — future migration
}
```

### Internal State
- `currentMonth: Date` — for navigation
- `viewMode: 'consolidated' | 'per-account'` — toggle state
- `selectedDay: Date | null` — which day's detail panel is shown

### Data Aggregation (computed)
```typescript
interface DayData {
  date: string; // YYYY-MM-DD
  totalPnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
  bestTrade: number;
  worstTrade: number;
  // Per-account breakdown (Dashboard only)
  byAccount?: Record<string, { accountName: string; pnl: number; trades: number }>;
}
```

---

## 5. Styling Tokens

All new components use landing page design tokens:

| Token | Usage |
|-------|-------|
| `landing-card` class | Card container |
| `--landing-bg-elevated` | Card background |
| `--landing-bg-tertiary` | KPI boxes, nested elements |
| `--landing-border` | Subtle borders |
| `--landing-border-strong` | Selected state borders |
| `--landing-accent` | Blue (profit cells, accents) |
| `--landing-accent-danger` | Red (loss cells) |
| `--landing-accent-warning` | Orange (warnings) |
| `--landing-text` | Primary text |
| `--landing-text-muted` | Labels, secondary text |
| `shadow-landing-card` | Card shadow |
| `font-mono` | All values and labels |
| `rounded-2xl` | Card containers (matches `landing-card` CSS class) |
| `rounded-lg` | Calendar cells, KPI boxes |

---

## 6. Dark Mode

The landing page tokens already have dark mode variants defined in `globals.css`. The calendar component inherits dark mode automatically through CSS variables. No additional dark mode logic needed.

---

## 7. Responsive Behavior

- **Desktop (lg+):** Calendar + day panel side by side (flex-row)
- **Tablet (md):** Calendar + day panel stacked (flex-col), panel below calendar
- **Mobile (sm):** Calendar cells smaller, day panel as expandable section below
- Journal Briefing: 3-section layout collapses to stacked on mobile

---

## 8. Files to Create/Modify

### New Files
- `components/calendar/CalendarPnl.tsx` — shared calendar + day panel component
- `components/calendar/DayDetailPanel.tsx` — day detail panel (right side)
- `components/calendar/CalendarGrid.tsx` — month grid with colored cells
- `components/dashboard/JournalBriefing.tsx` — premium briefing card

### Modified Files
- `app/app/page.tsx` — Dashboard: reorder sections, add CalendarPnl + JournalBriefing
- `app/app/journal/page.tsx` — Journal: remove calendar tab, integrate CalendarPnl into Visao Geral
- `components/journal/PnlCalendar.tsx` — deprecate (replaced by CalendarPnl)

### No Changes
- `components/landing/JournalMockup.tsx` — reference only, not modified
- News API, Watchlist component — unchanged
- Database schema — no new tables or columns (uses existing `journal_trades` + `day_notes`)

### Layout Note
- Dashboard uses `max-w-7xl` (intentional exception to the `max-w-6xl` convention — the calendar + 280px panel needs the extra width)

---

## 9. Out of Scope

- Tags, setup, emotion fields in day detail (no DB schema yet)
- Editable day notes from calendar (read-only for now)
- Weekly summary column from current PnlCalendar (removed in redesign)
- Calendar for prop account constraints visualization
- Currency conversion — all values display as USD (`$`) since the database stores `_usd` columns. The `R$` in mockups is for visual reference only.
