# Forensic Audit: Dashboard & Account Pages

**Date:** 2026-03-28
**Auditor:** Code Quality Analyzer
**Scope:** 5 pages + layout + 6 widget components

---

## Page: Dashboard Home — /app

**File:** `app/app/page.tsx` (~1231 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | `DashboardSkeleton` rendered while `journalLoading || !sessionChecked` |
| Empty state | PASS | Each widget handles zero-trade gracefully ("Nenhum ativo registrado", "Dados insuficientes", etc.) |
| Error state | WARN | Supabase errors logged to console but no user-visible error banner on the main dashboard. News error is shown inline. |
| Auth gated | PASS | Wrapped by `AuthGate` via `app/app/layout.tsx` |
| Dark mode | PASS | Uses CSS variables and `resolvedTheme` for TradingView iframes |
| bg-card bug | WARN | Multiple instances of `bg-card` without inline style: line 273 BacktestSection wrapper, line 601 ticker tape, line 663 chart wrapper. AccountsOverview KPI cards (line 209) and table (line 219) use `bg-card` without inline style. |
| Performance | WARN | Data fetches are mostly parallel (Promise.all for journal+accounts, then prop_accounts+prop_payouts). However, day_notes fetch is sequential AFTER the main batch (waterfall). News fetch is independent (good). TradingView iframes are lazy-loaded via IntersectionObserver (good). Heavy dynamic imports with code splitting (good). |
| Data accuracy | PASS | P&L calculations exclude backtest trades from main KPIs. Equity curve aggregates by day correctly. Payoff/expectancy formulas are standard. |
| Account switch | WARN | `activeAccountId` is read but most widgets show ALL accounts by default with per-widget account selectors. Changing the global active account does NOT automatically filter all widgets. |
| Mobile | WARN | Uses responsive grid (`grid-cols-1 xl:grid-cols-12`). TradingView ticker has fixed 46px height. Quick asset buttons wrap. Page width is `max-w-none` with padding — functional but chart iframe at 500px height may be excessive on mobile. |

### Issues Found:
- **[MEDIUM]** `bg-card` without inline style in BacktestSection (line 273), ticker tape wrapper (line 601), chart wrapper (line 663). Per project rules, `bg-card` alone is NOT reliable.
- **[MEDIUM]** `AccountsOverview` uses `bg-card` without inline style on KPI cards (line 209) and table container (line 219).
- **[LOW]** `day_notes` fetch is a waterfall after the main Promise.all batch. Could be included in the parallel fetch.
- **[LOW]** Dashboard page is ~1231 lines. Consider extracting more inline widgets (StreaksWidget, TopSymbolsWidget, TiltmeterWidget, AiInsightWidget, NewsWidget) to separate files.
- **[LOW]** No user-facing error state for main Supabase query failure — only console.warn. User sees empty dashboard with no explanation.
- **[INFO]** 6+ Supabase queries on mount: getSession, profiles (layout), journal_trades, accounts, prop_accounts, prop_payouts, day_notes. Mostly parallel except day_notes.

### Special: Supabase Query Count
1. `supabase.auth.getSession()` — session check
2. `supabase.from("profiles").select("dashboard_layout")` — layout
3. `supabase.from("journal_trades").select(...)` — trades (parallel with #4)
4. `supabase.from("accounts").select(...)` — accounts (parallel with #3)
5. `supabase.from("prop_accounts").select(...)` — prop details (parallel with #6, sequential after #3/#4)
6. `supabase.from("prop_payouts").select(...)` — payouts (parallel with #5)
7. `supabase.from("day_notes").select(...)` — calendar notes (WATERFALL after #5/#6)
8. `fetch("/api/news")` — independent, parallel

**Verdict: 8 queries, mostly parallel with 1 unnecessary waterfall (day_notes).**

---

## Page: Account Management — /app/account

**File:** `app/app/account/page.tsx` (108 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | FAIL | No loading indicator while fetching profile/email on mount |
| Empty state | PASS | Form shows empty fields if no profile exists |
| Error state | PASS | Error string displayed below form |
| Auth gated | PASS | Via layout AuthGate |
| Dark mode | PASS | Uses CSS variables, `text-emerald-600` for success (works in both modes) |
| bg-card bug | FAIL | Lines 60, 80, 97: `bg-card` class used without inline style on all 3 section containers |
| Performance | PASS | 2 parallel-ish fetches (getSession + profiles query) |
| Data accuracy | N/A | Profile display only |
| Account switch | N/A | Not account-dependent |
| Mobile | PASS | `max-w-2xl` with padding, single column layout |

### Issues Found:
- **[CRITICAL]** `supabase.auth.signOut()` used on line 44. This VIOLATES the project auth rule: "NEVER use `supabase.auth.signOut()` — use manual localStorage cleanup". This causes logout freeze bug.
- **[HIGH]** `bg-card` without inline style on 3 containers (lines 60, 80, 97). Cards may appear transparent.
- **[MEDIUM]** No loading skeleton/spinner on initial mount. Profile and email load asynchronously but user sees empty form briefly.
- **[LOW]** Missing accents in Portuguese text: "Configuracoes" (should be "Configurações"), "exibicao" (should be "exibição"), "nao" (should be "não").
- **[LOW]** No account deletion flow — just "entre em contato com o suporte". This is fine but inconsistent with the Settings page which has a full delete modal.
- **[INFO]** This page duplicates functionality from `/app/settings` (profile editing, theme toggle, logout). Consider deprecating this page or redirecting to Settings.

### Special: signOut() Violation
```typescript
// Line 43-46 — VIOLATES AUTH RULE
function handleLogout() {
    supabase.auth.signOut().finally(() => {
      window.location.replace("/login");
    });
}
```
**Fix:** Replace with manual localStorage cleanup pattern used elsewhere in the codebase.

---

## Page: Settings — /app/settings

**File:** `app/app/settings/page.tsx` (680 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | Loader2 spinner for profile, subscription, and dashboard layout sections |
| Empty state | PASS | Empty form fields with placeholders |
| Error state | PASS | Error state with AlertTriangle icon + retry button for profile load failure |
| Auth gated | PASS | Via layout AuthGate |
| Dark mode | PASS | Uses CSS variables throughout. `text-green-600` / `text-red-500` for messages. |
| bg-card bug | PASS | All Cards use `style={cardStyle}` where `cardStyle = { backgroundColor: "hsl(var(--card))" }` |
| Performance | PASS | Profile + session fetched in parallel via Promise.all. Dashboard layout loaded from DB with localStorage fallback. |
| Data accuracy | N/A | Settings page |
| Account switch | N/A | Not account-dependent |
| Mobile | WARN | `max-w-6xl` is wide. Dashboard widget reorder UI (checkboxes + up/down arrows) works but is dense on 375px. Delete modal is `max-w-md` (good). |

### Issues Found:
- **[LOW]** Dashboard layout save has a silent catch for DB column not existing (`catch {}`). This swallows real errors beyond the 42703 check.
- **[LOW]** Delete account confirmation modal uses native `alert()` for error display (line 660) rather than in-modal error state.
- **[INFO]** Empty dependency array on useEffect with eslint-disable comment (line 128). This is intentional (load once) but worth noting.

### Special: Account Deletion Flow
- Has confirmation modal requiring user to type "EXCLUIR"
- Calls `DELETE /api/account/delete` with Bearer token
- On success: `localStorage.clear()` + redirect to `/`
- Does NOT explicitly mention Stripe subscription cancellation in the UI, but the API endpoint likely handles it
- **No Stripe cancellation confirmation** shown to user before deletion — user with active subscription could lose access without explicit warning

### Special: Theme Persistence
- Uses `ThemeToggle` component (separate from the account page's inline theme buttons)
- Theme persisted via ThemeProvider in localStorage (`trading-dashboard-theme`)

---

## Page: Pricing — /app/pricing

**File:** `app/app/pricing/page.tsx` (15 lines) + `components/billing/PricingCards.tsx` (~350 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | PASS | Button shows "Redirecionando..." while Stripe checkout loads |
| Empty state | N/A | Static pricing display |
| Error state | WARN | Uses `alert()` for errors (line 175, 203). Not ideal UX. |
| Auth gated | PASS | Via layout AuthGate |
| Dark mode | PASS | CSS variables + conditional dark classes on badges |
| bg-card bug | PASS | PricingCards uses `style={{ backgroundColor: "hsl(var(--card))" }}` |
| Performance | PASS | Lightweight page, no heavy fetches on mount |
| Data accuracy | PASS | Prices are hardcoded constants matching tier definitions |
| Account switch | N/A | Not account-dependent |
| Mobile | PASS | `md:grid-cols-3` responsive grid, stacks on mobile |

### Issues Found:
- **[MEDIUM]** Error handling uses `alert()` (lines 175, 203) instead of inline UI feedback. Poor UX on mobile especially.
- **[LOW]** `handleSubscribe` catch block is empty (`catch { // ignore }` line 179). Network errors are silently swallowed.
- **[LOW]** Confetti fires on EVERY toggle to annual, even if user is just toggling back and forth. Minor annoyance.
- **[INFO]** Upgrade/downgrade for existing subscribers correctly routes through Stripe Portal.

### Special: Stripe Checkout Flow
1. Gets session token from Supabase
2. POSTs to `/api/billing/checkout` with plan + interval
3. Redirects to Stripe-hosted checkout URL
4. For existing subscribers, upgrade/downgrade goes through `/api/billing/portal`
5. **No client-side validation** of session before showing pricing — relies on AuthGate

---

## Page: Subscription Success — /app/subscription/success

**File:** `app/app/subscription/success/page.tsx` (55 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Loading state | FAIL | No loading state while `refreshSubscription()` runs. Plan might show wrong tier briefly. |
| Empty state | N/A | Static success message |
| Error state | FAIL | No error handling if `refreshSubscription()` fails |
| Auth gated | PASS | Via layout AuthGate |
| Dark mode | PASS | Uses CSS variables, `text-green-500` for check icon |
| bg-card bug | N/A | No cards on this page |
| Performance | PASS | Single API call to refresh subscription |
| Data accuracy | WARN | Displays plan name from SubscriptionContext, but if refresh fails, shows stale plan |
| Account switch | N/A | Not account-dependent |
| Mobile | PASS | `max-w-md` centered layout |

### Issues Found:
- **[HIGH]** No payment verification. If a user navigates directly to `/app/subscription/success` without paying, they see "Assinatura ativada!" with the success UI. The `refreshSubscription()` will fetch the actual plan from Supabase, but there is a flash of success messaging regardless. Should verify `session_id` from Stripe URL params.
- **[MEDIUM]** No loading state during `refreshSubscription()`. User sees success page instantly but plan badge may be stale for a moment.
- **[MEDIUM]** No error handling if subscription refresh fails. User sees success message even if the webhook hasn't processed yet.
- **[LOW]** ProOnboardingModal check happens on mount but `refreshSubscription` is async — race condition where modal may show before plan is confirmed.

### Special: Direct Navigation Without Payment
A user can bookmark or manually navigate to `/app/subscription/success`. They will see the success page with "Assinatura ativada!" and the plan from their current subscription context (likely "free" if they never paid). The CTA button leads back to `/app` which is harmless, but the UX is confusing.

---

## Component: App Layout — /app/layout.tsx

**File:** `app/app/layout.tsx` (16 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Auth gated | PASS | Wraps children in `<AuthGate>` |
| Providers | PASS | `PrivacyProvider` wraps all app pages |
| Bootstrap | PASS | `BootstrapWarning` banner for account creation failures |

No issues found. Clean, minimal layout.

---

## Component: WidgetRenderer

**File:** `components/dashboard/WidgetRenderer.tsx` (130 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Dark mode | PASS | No color handling — delegates to child widgets |
| bg-card bug | N/A | No bg-card usage |
| Performance | PASS | Simple filter/sort/map rendering |

### Issues Found:
- **[LOW]** `mergeLayout` discards user layout entirely if `version !== DEFAULT_LAYOUT.version`. This means a version bump wipes all customization silently. Could migrate instead.

---

## Component: AccountsOverview

**File:** `components/dashboard/AccountsOverview.tsx` (376 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Empty state | PASS | "Nenhuma conta ativa encontrada." row in table |
| Dark mode | PASS | Uses CSS variables for colors |
| bg-card bug | FAIL | KPI cards (line 209) use `bg-card` class without inline style. Table container (line 219) also uses `bg-card` without inline style. |

### Issues Found:
- **[HIGH]** `bg-card` without inline style on KPI card divs (line 209) and table wrapper (line 219). These will appear transparent in some contexts.
- **[MEDIUM]** Drawdown calculation uses monthly losses for "Total DD" (line 129-131), but DD total in prop firm rules is usually trailing from high-water mark, not monthly reset. This could give traders a false sense of safety.
- **[LOW]** Status emoji "⚠️ Risco" (line 335) uses emoji instead of Lucide icon, inconsistent with FINDING-009 fix from recent commits.

---

## Component: BacktestSection

**File:** `components/dashboard/BacktestSection.tsx` (414 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Empty state | PASS | Shows empty state with FlaskConical icon and "Nenhuma conta de backtest" |
| Dark mode | PASS | Uses CSS variables |
| bg-card bug | WARN | Line 273 uses `bg-card` class directly on wrapper div without inline style |

### Issues Found:
- **[MEDIUM]** `bg-card` on line 273 without inline style.
- **[LOW]** `QuickTradeForm` sets `net_pnl_usd` implicitly (via `pnl_usd` insert without explicit `net_pnl_usd`). If the DB default for `net_pnl_usd` is null, KPIs would break. Should explicitly set `net_pnl_usd: pnlNum`.
- **[LOW]** `setSaving(false)` called in finally block AND in the success path (line 123, 134), leading to double setState. Minor.

---

## Component: EquityCurveMini

**File:** `components/dashboard/EquityCurveMini.tsx` (112 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Empty state | PASS | "Dados insuficientes" when less than 2 data points |
| Dark mode | PASS | Inline styles with CSS variables |
| bg-card bug | PASS | Uses inline `backgroundColor: "hsl(var(--card))"` |

No issues found. Clean component.

---

## Component: JournalBriefing

**File:** `components/dashboard/JournalBriefing.tsx` (422 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Empty state | PASS | "Nenhuma trade registrada." for recent trades |
| Dark mode | WARN | Tooltip contentStyle uses hardcoded `rgba(10, 10, 10, 0.8)` (line 316) — always dark background regardless of theme |
| bg-card bug | WARN | Uses `bg-card` class on root div (line 152) without inline style |

### Issues Found:
- **[MEDIUM]** `bg-card` on root container (line 152) without inline style.
- **[LOW]** Tooltip uses hardcoded dark background `rgba(10, 10, 10, 0.8)` regardless of light/dark theme. In light mode this looks intentional (dark tooltip on light page) but breaks consistency with other tooltips.

---

## Component: SessionHeatmap

**File:** `components/dashboard/SessionHeatmap.tsx` (126 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Empty state | PASS | Shows 0 trades / 0% WR for sessions with no data |
| Dark mode | PASS | Inline styles with CSS variables |
| bg-card bug | PASS | Uses inline style for backgroundColor |

No issues found. Clean component.

---

## Component: TiltmeterGauge

**File:** `components/dashboard/TiltmeterGauge.tsx` (211 lines)

| Check | Status | Notes |
|-------|--------|-------|
| Dark mode | WARN | Hardcoded RGB colors for gauge segments (lines 53-67) and zone labels (lines 77-81). These don't adapt to theme. |
| bg-card bug | N/A | SVG component, no bg-card |

### Issues Found:
- **[LOW]** Dynamic Tailwind class on line 204: `` `text-[${s.labelSize + 1}px]` `` — Tailwind cannot generate dynamic class names at build time. This class will NOT apply. Should use inline style instead.
- **[LOW]** Hardcoded RGB colors throughout — functional but not theme-aware.

---

## Summary

### Overall Quality Score: 7/10
### Files Analyzed: 13
### Issues Found: 28
### Technical Debt Estimate: 8-12 hours

### Critical Issues (1)
1. **signOut() violation** in `/app/account/page.tsx` line 44 — causes logout freeze bug

### High Severity (3)
1. **bg-card bug** in AccountsOverview (lines 209, 219) — transparent cards
2. **bg-card bug** in Account page (lines 60, 80, 97) — transparent sections
3. **No payment verification** on subscription success page — misleading UX

### Medium Severity (8)
1. bg-card in BacktestSection (line 273)
2. bg-card in JournalBriefing (line 152)
3. bg-card in dashboard ticker/chart wrappers (lines 601, 663)
4. Drawdown calculation may not match prop firm trailing DD rules
5. No loading state on subscription success page
6. No error handling on subscription success refresh
7. alert() for errors in PricingCards (lines 175, 203)
8. No loading indicator on account page mount

### Positive Findings
- Excellent code splitting with dynamic imports and loading skeletons
- Parallel Supabase queries via Promise.all
- Privacy mode (mask/hide values) consistently implemented across all widgets
- Widget system is well-architected with layout persistence (DB + localStorage fallback)
- Settings page has proper loading/error/retry states — best practice example
- Delete account flow has proper confirmation modal with typed confirmation
- TradingView iframes lazy-loaded via IntersectionObserver
- All pages properly wrapped by AuthGate via layout
- Consistent use of CSS variables for theming in most components
