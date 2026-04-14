# Core Pages Forensic Audit — 2026-03-28

## Page 1: Journal — `/app/journal`
**File:** `app/app/journal/page.tsx` (580 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | Skeleton pulses while `accountsLoading` or `loadingTrades` (lines 495-518) |
| Empty state | PASS | "Selecione uma conta" when no account; empty handled per-component |
| Error state | WARN | `tradesError` shows raw Supabase message (line 522) -- no retry button |
| Auth gated | PASS | Parent layout wraps all `/app/**` in `<AuthGate>` (app/app/layout.tsx) |
| Dark mode | PASS | Uses semantic tokens throughout, no hardcoded hex on this page |
| bg-card bug | PASS | Card component itself injects inline `backgroundColor` -- no bug here |
| Performance | WARN | Loads ALL trades for the account with no limit (line 111). For accounts with 1000+ trades this could be slow |
| Data accuracy | WARN | See KPI edge cases below |
| Account filtering | PASS | All queries filter by `activeAccountId` |
| Mobile | WARN | Header row with Tiltmeter + Add Trade + Privacy toggle will overflow on 375px; no `flex-wrap` |

### Sub-component Issues

#### JournalKpiCards.tsx (134 lines)
- **[LOW] Best trade always shows "+" prefix** (line 117): If all trades are losses, "best" is still negative but displayed as `+{negative}` which renders as `+-50.00`.
- **[LOW] Winrate treats net_pnl_usd == 0 as a loss** (line 42): `n <= 0` means breakeven trades count as losses.
- **[INFO] No Sharpe ratio** -- checklist mentioned it but it is not implemented; only payoff/expectation.

#### JournalEquityChart.tsx (137 lines)
- **[PASS] Handles empty data** (line 67): Shows "Nenhum trade no periodo" message.
- **[LOW] Hardcoded line colors** (line 59): `#059669` / `#dc2626` instead of CSS variables. Works in dark mode but breaks theming.

#### JournalTradesTable.tsx (353 lines)
- **[PASS] Pagination** at 15 items per page.
- **[PASS] Empty state** with icon and helpful text.
- **[PASS] Filters** for direction, result, symbol, date range.
- **[LOW] No virtual scrolling** -- 15-item pages mitigate this but filtered view has no limit.
- **[INFO] Amber left-border** on trades without emotion/notes is a nice touch for journal completion.

#### AddTradeModal.tsx (243 lines)
- **[MEDIUM] net_pnl_usd calculation is wrong** (line 62): `pnl + fees` but fees are typically negative (commissions). If user enters fees as positive (e.g., 5.00 meaning $5 commission), the net becomes `pnl + 5` instead of `pnl - 5`. The sign convention is ambiguous and undocumented.
- **[LOW] No validation on PnL input** -- user can type non-numeric strings; `parseFloat` returns NaN silently.
- **[LOW] Uses `alert()` for errors** (lines 70, 88) instead of toast/inline error.
- **[LOW] Missing accent on "Direcao"** (line 131) and "Observacoes" (line 221) -- should be "Direção" and "Observações".

#### ImportDropZone.tsx (111 lines)
- **[PASS] Drag & drop** works correctly with visual feedback.
- **[INFO] Accepts .csv** for cTrader but cTrader parser status is unclear from this file.

#### TradeDetailModal.tsx (353 lines)
- **[PASS] Full CRUD** -- save and delete with confirmation.
- **[PASS] Psychology section** behind PaywallGate.
- **[LOW] Delete has no undo** -- uses `confirm()` browser dialog instead of a proper confirmation modal.

#### DayDetailModal.tsx (484 lines)
- **[PASS] Loading state** with skeleton.
- **[PASS] Auto-save on close** when dirty.
- **[PASS] Tag management** with user-saved tags.
- **[LOW] `JSON.stringify(accountIds)` in useCallback dependency** (line 196) -- creates new string reference every render, potentially causing unnecessary re-fetches.

#### CalendarPnl.tsx (249 lines)
- **[PASS] Month navigation** with prev/next.
- **[PASS] KPI strip** with month stats.
- **[PASS] Click on day opens DayDetailModal**.
- **[INFO] Uses `landing-*` CSS variables** -- works but semantically odd for an app page component.

---

## Page 2: Reports — `/app/reports`
**File:** `app/app/reports/page.tsx` (20 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | N/A | Redirect page only |
| Empty state | PASS | Shows "Redirecionando para o Journal..." |
| Error state | N/A | No data fetching |
| Auth gated | PASS | Under `/app/**` layout |
| Dark mode | PASS | Semantic classes only |
| bg-card bug | N/A | No cards |
| Performance | N/A | Instant redirect |
| Data accuracy | N/A | No calculations |
| Account filtering | N/A | No data |
| Mobile | PASS | Simple centered text |

### Issues Found:
- **[LOW] Uses `router.replace`** (line 9) -- CLAUDE.md says "NEVER use `router.replace()` in auth flows". This is not an auth flow per se, but the pattern is discouraged. Should use `redirect()` from next/navigation for server-side redirect, or keep as-is since it is a simple non-auth redirect.
- **[INFO] Dead page** -- this page only redirects to Journal. The "Relatorios" tab in Journal (SECTION_REPORTS) renders `JournalReports` behind PaywallGate. There are 8 report components under `components/reports/` that are presumably used by JournalReports.

---

## Page 3: Prop — `/app/prop`
**File:** `app/app/prop/page.tsx` (374 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | Full skeleton with card structure (lines 161-188) |
| Empty state | PASS | Two empty states: non-prop account (line 137) and no data (line 211) |
| Error state | PASS | Error card with AlertCircle icon and message (lines 191-208) |
| Auth gated | PASS | Under `/app/**` layout |
| Dark mode | PASS | Uses semantic tokens; red/emerald with dark variants |
| bg-card bug | PASS | All Cards use `style={{ backgroundColor: "hsl(var(--card))" }}` AND the Card component has it built-in |
| Performance | PASS | Single account view, bounded data |
| Data accuracy | WARN | See drawdown issues below |
| Account filtering | PASS | Filtered by `activeAccountId` + `isProp` check |
| Mobile | PASS | Responsive grid `grid-cols-1 lg:grid-cols-12` |

### Issues Found:

- **[MEDIUM] Drawdown denominator when highWaterMark/startingBalance is 0** (prop-stats.ts line 49): `safeDenom` falls back to 1 if denominator is 0, which produces meaningless percentages (e.g., a $500 loss would show as 50000% drawdown). This would happen if the RPC returns 0 for both `high_water_mark` and `starting_balance`.

- **[MEDIUM] Overall distance calculation ignores trailing drawdown** (page line 250): `overallLossUsed = Math.max(0, -profit)` uses cycle profit, not actual drawdown from high water mark. For trailing DD accounts, the "distance from overall" metric is incorrect because it should measure from HWM, not from starting balance.

- **[LOW] Hardcoded red colors** (line 203): `text-red-500`, `text-red-600 dark:text-red-400` -- works but not using `--pnl-negative` CSS variable.

- **[LOW] Alert toasts accumulate** (line 119): `setAlerts((prev) => [...prev, ...newAlerts])` never clears old alerts. If user navigates away and back, alerts pile up.

- **[INFO] Right sidebar area is empty** -- `lg:col-span-8` used but no `lg:col-span-4` sibling. Wastes 1/3 of screen on desktop.

---

## Page 4: News — `/app/news`
**File:** `app/app/news/page.tsx` (279 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | 6-item skeleton cards (lines 165-184) |
| Empty state | PASS | Shows "Nenhuma noticia disponivel" with filter context (lines 199-211) |
| Error state | PASS | Error card with message (lines 187-197) |
| Auth gated | PASS | Under `/app/**` layout |
| Dark mode | PASS | Semantic classes + dark: variants for impact badges |
| bg-card bug | PASS | All Cards use inline style |
| Performance | PASS | Caps at 20 items client-side (line 97), API caps at 10 (route line 114) |
| Data accuracy | N/A | Display only |
| Account filtering | N/A | Not account-specific |
| Mobile | PASS | Single column layout, flex-wrap on filters |

### Issues Found:

- **[LOW] Missing accents** in Portuguese text: "ha" should be "ha" (actually "ha" is acceptable informal), but "Noticias" (line 129) should be "Noticias" -- actually this is consistent with the file so likely intentional ASCII-only.

- **[LOW] Auto-refresh during background tab** (line 90): `setInterval(fetchNews, AUTO_REFRESH_MS)` keeps firing even when tab is inactive. Should use `document.visibilityState` or `requestIdleCallback` to pause.

- **[LOW] Impact classification is naive** (route.ts lines 22-60): Keyword-based with no weighting. "rate" matches "corporate rate" or "rate my food". Many false positives possible.

- **[LOW] API returns 200 even on error** (route.ts lines 91-93, 127-131): `{ status: 200 }` with error field. Client handles this but it masks real failures from monitoring.

- **[INFO] ISR revalidation** at 300 seconds (5 min) is correct per spec.

- **[INFO] `lastFetchedLabel` uses `useMemo` with `lastFetched` dep** (line 117-120) but `timeAgo` depends on `Date.now()` which changes -- the label will be stale until next fetch. Minor UX issue.

---

## Summary

| Metric | Value |
|--------|-------|
| Pages Analyzed | 4 |
| Components Analyzed | 10 |
| Critical Issues | 0 |
| Medium Issues | 3 |
| Low Issues | 14 |
| Info Notes | 7 |

### Medium Issues (require attention)
1. **AddTradeModal net_pnl_usd sign bug** -- `pnl + fees` assumes fees are negative, but UI suggests positive input. Can corrupt P&L data.
2. **Prop drawdown safeDenom=1 fallback** -- produces nonsensical percentages when balance data is missing.
3. **Prop overall distance ignores trailing DD** -- uses cycle profit instead of HWM-based distance for trailing accounts.

### Positive Findings
- **bg-card bug fully mitigated** -- Card component has inline style built in.
- **AuthGate at layout level** -- all `/app/**` pages are protected.
- **Consistent dark mode** -- no hardcoded colors that break in dark mode (chart colors are minor).
- **Good loading/empty states** -- all pages handle loading and empty gracefully.
- **Privacy masking** -- KPI values, PnL, and equity chart all respect privacy toggle.
- **Import flow is robust** -- preview, confirm, timeout handling, error states, progress indicator.
- **Pagination in trades table** -- prevents rendering large datasets.
