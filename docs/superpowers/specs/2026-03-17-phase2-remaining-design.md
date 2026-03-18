# Phase 2 Remaining — Design Spec

**Status:** APPROVED
**Date:** 2026-03-17
**Items:** Import Melhorado, Onboarding Step 4, Dashboard Consolidado Pro+, cTrader Parser

---

## 1. Import Melhorado

### Flow (4 states)

**State 1 — Drop Zone:**
- Dashed border container with drag & drop support
- `onDragOver` highlight (border color change + background tint)
- Format badges: MT5 XLSX, MT5 HTML, cTrader CSV (disabled badge until parser ready)
- Fallback "Selecionar arquivo" button → hidden file input
- Accepts: `.xlsx`, `.html`, `.htm`, `.csv`

**State 2 — Preview:**
- Client-side parse (reuse existing MT5 parsers via API call)
- Show file name, trade count, payout count, "Parseado OK" badge
- Table with 5 first trades: Símbolo, Direção (colored), Lotes, P&L (colored), Data
- "Mostrando 5 de N trades" footer
- Buttons: "Cancelar" (back to drop zone) | "Importar N trades" (proceed)

**State 3 — Progress:**
- Animated progress bar
- "X de Y trades processados" counter
- Uses existing `/api/journal/import-mt5` endpoint

**State 4 — Result:**
- 3 KPI cards: importados (green), duplicatas (yellow), falhou (red)
- "Ver detalhes (N erros)" button → opens Discrepancy Modal
- "Analisar com AI Coach" button (Pro+ only, links to `/app/ai-coach`)

### Discrepancy Modal
- shadcn Dialog component
- Sections: success count, duplicates list (trade + "Já existe"), errors list (line + reason)
- Import metadata: filename, timestamp, duration
- Close button

### Component Architecture
- New: `components/journal/ImportDropZone.tsx` — shared drop zone (used by journal + onboarding)
- New: `components/journal/ImportPreview.tsx` — preview table
- New: `components/journal/ImportResult.tsx` — result KPIs + discrepancy modal trigger
- New: `components/journal/DiscrepancyModal.tsx` — modal with import details
- Modified: `app/app/journal/page.tsx` — replace current file input with ImportDropZone flow

### API Changes
- Existing `/api/journal/import-mt5` already returns `trades_found`, `imported`, `duplicates`, `failed`
- Add to response: `skipped_details: Array<{ line: number; reason: string; data?: string }>` for discrepancy report
- Add: `preview` query param → when `?preview=true`, parse only, return first 5 trades without importing

---

## 2. Onboarding Step 4 — Real Import

### Changes
- Replace "Disponível em breve" placeholder with functional `ImportDropZone` component (compact variant)
- Compact mode: 3-trade preview (vs 5 in journal), smaller padding
- After successful import: redirect to `/app` with `?imported=true` query param → show success toast
- "Explorar primeiro" → redirect to `/app` (no change)
- ImportDropZone prop: `compact?: boolean` for onboarding variant

### Files
- Modified: `app/onboarding/page.tsx` — Step 4 uses ImportDropZone with `compact` prop
- The ImportDropZone component handles both contexts via props

---

## 3. Dashboard Consolidado "Visão Geral" (Pro+)

### Header KPIs (4 cards)
- Capital Total Funded: sum of `starting_balance_usd` from active prop accounts
- Total Sacado: sum of `prop_payouts.amount_usd`
- P&L Mês: sum of `journal_trades.net_pnl_usd` for current month (all accounts)
- Contas Ativas: count of active accounts

### Accounts Table
- Columns: Conta (name + phase), P&L Mês, DD Diário (% / limit%), DD Total (% / limit%), Win Rate, Status
- Status badges: "⚠️ Risco" (red, DD > 70% of limit), "OK" (green), "Pessoal" (blue), "Crypto" (yellow)
- Sorted by risk: highest drawdown percentage first (prop accounts), then personal, then crypto
- Personal/crypto accounts show "—" for DD columns
- Prop accounts show drawdown via existing `calc_drawdown` RPC
- Row highlight: subtle red background for accounts at risk (DD > 70%)

### Tier Gating
- Pro+: full view with all data
- Free: blurred overlay with paywall CTA "Assinar Pro — R$79,90/mês" → links to `/app/pricing`
- Use existing `PaywallGate` component with `plan="pro"`

### Layout Position
- New section between Calendar Consolidado and Performance + News cards
- Full width (same as calendar)

### Files
- New: `components/dashboard/AccountsOverview.tsx` — header KPIs + accounts table
- Modified: `app/app/page.tsx` — add AccountsOverview between calendar and performance sections

### Data Fetching
- Reuse existing account + trade queries from dashboard page
- Add: fetch `prop_payouts` sum for "Total Sacado"
- Add: call `calc_drawdown` RPC for each prop account (parallel Promise.all)

---

## 4. cTrader Parser

### Format
- cTrader exports trades as CSV
- Columns (typical): Position ID, Symbol, Direction (Buy/Sell), Volume, Entry Price, Close Price, Profit, Commission, Swap, Open Time, Close Time
- Encoding: UTF-8
- Delimiter: comma (may vary by locale — support semicolon fallback)

### Implementation
- New: `lib/ctrader-parser.ts`
- Function: `parseCtraderCsv(buffer: Buffer): ParsedTrades`
- Same output interface as MT5 parsers (`ParsedTrades` type)
- Header detection: find row with "Position ID" or "Symbol" column
- Map columns to standard trade fields (symbol, direction, pnl_usd, lots, opened_at, closed_at)
- External ID: Position ID
- External source: `ctrader`

### API Changes
- Modified: `/api/journal/import-mt5` → rename concept to `/api/journal/import` (keep old route as alias)
- Auto-detect format by file extension: `.csv` → try cTrader parser, `.xlsx` → MT5 XLSX, `.html/.htm` → MT5 HTML
- Add format detection fallback: if CSV headers don't match cTrader, return error with helpful message

### UI Changes
- Drop zone badge: "cTrader CSV" changes from disabled to enabled
- No other UI changes needed — same flow (drop → preview → import → result)

### Testing
- Parser built but NOT tested with real reports (user has none yet)
- Unit tests with synthetic CSV data matching expected cTrader format

---

## Non-Goals
- MT4 parser (deferred)
- Email parser / auto-import (Phase 3)
- Equity curve comparison per account (Phase 3 Elite feature)
- Real-time drawdown (uses existing import-based data)
