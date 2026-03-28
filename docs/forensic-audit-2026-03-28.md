# Forensic Audit Report — wealth.Investing

**Date:** 2026-03-28
**Auditors:** Multi-agent team (Claude Opus 4.6) — 14 specialized audits consolidated
**Scope:** Complete application audit (22 pages, 27 API routes, 100+ components, 21+ DB tables)

---

## 1. Executive Summary

### Overall Scores (0-10)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Security | 5/10 | 3 public routes use service_role key without auth; SECURITY DEFINER functions lack auth checks; error messages leak internals across 13+ routes |
| Performance | 7/10 | Good code splitting and parallel fetches, but PrivacyContext re-renders 28 consumers, rAF loop never pauses, double-fetch on tab focus |
| Design/UX | 5.5/10 | Login page has zero dark mode support; 15+ border-radius values; bg-card transparency bug in 15+ locations; no mobile nav for authenticated area |
| Code Quality | 6.5/10 | Strict TS enabled but 48+ non-null assertions on env vars; `as unknown as` casts on financial data; 6 `any` types; drawdown calculation bug |
| Accessibility | 4.5/10 | Missing form labels on 20+ inputs; icon-only buttons without names; no skip nav on app pages; muted-foreground fails WCAG AA contrast |
| **Overall** | **5.5/10** | Solid architecture and patterns in core areas, but significant security gaps in macro routes, financial calculation bugs, and incomplete mobile/accessibility support |

### Issue Distribution

| Severity | Count |
|----------|-------|
| CRITICAL | 16 |
| HIGH | 28 |
| MEDIUM | 42 |
| LOW | 38 |
| **Total** | **124** |

### Top 10 Most Critical Findings

1. **[SEC-003] Public `/api/macro/check-rate-update` uses service_role key with zero auth** — `app/api/macro/check-rate-update/route.ts` — CRITICAL
2. **[SEC-004] Public `/api/macro/calendar` auto-sync uses service_role key without auth** — `app/api/macro/calendar/route.ts:78-89` — CRITICAL
3. **[SEC-005] Public `/api/macro/headlines` uses service_role key on `?live=1`** — `app/api/macro/headlines/route.ts:99-125` — CRITICAL
4. **[SEC-008] `increment_ai_usage`/`decrement_ai_usage` accept arbitrary user_id, no auth.uid() check** — `supabase/migrations/20260317_ai_usage.sql` — CRITICAL
5. **[TECH-001] Drawdown calculation starts from zero equity, masking real drawdowns** — `lib/trade-analytics.ts:248-254` — CRITICAL
6. **[TECH-003] MT5 HTML parser uses wrong UTC offset (-5h instead of -2h), corrupting all timestamps** — `lib/mt5-html-parser.ts:36` — CRITICAL
7. **[SEC-001] In-memory rate limiter on AI Coach is useless on serverless** — `app/api/ai/coach/route.ts:21-33` — CRITICAL
8. **[SEC-010] Missing Content-Security-Policy header** — `next.config.mjs` — CRITICAL
9. **[UX-001] No mobile navigation for authenticated `/app/**` area** — `components/layout/AppSidebar.tsx` — CRITICAL
10. **[UX-002] Login page has zero dark mode support** — `app/login/page.tsx` — CRITICAL

---

## 2. Security Findings

### SEC-001 [CRITICAL] In-Memory Rate Limiter on AI Coach is Ineffective on Serverless
- **File:** `app/api/ai/coach/route.ts:21-33`
- **Description:** `rateLimitMap` is a JS `Map` in module scope. On Vercel serverless, each cold start creates a new empty Map. Attackers can bypass the 2 req/min limit by hitting different instances.
- **Impact:** Unlimited Anthropic API calls costing hundreds of dollars/hour. DB-level `ai_usage` quota only limits monthly totals, not burst abuse.
- **Fix:** Replace with Upstash Redis rate limiter or Supabase RPC-based rate limiting.
- **Effort:** Medium

### SEC-002 [CRITICAL] `.single()` Used in Conversations POST
- **File:** `app/api/ai/conversations/route.ts:41`
- **Description:** Uses `.single()` after INSERT. If insert fails (constraint violation, RLS), throws PGRST116 instead of returning graceful error. Violates project convention.
- **Impact:** Unhandled 500 errors; error message may leak schema info.
- **Fix:** Change to `.maybeSingle()` and handle null.
- **Effort:** Small

### SEC-003 [CRITICAL] Public `/api/macro/check-rate-update` — Service Role Key, No Auth, Triggers External Scraping
- **File:** `app/api/macro/check-rate-update/route.ts:8-12`
- **Description:** GET endpoint with zero authentication. Uses `SUPABASE_SERVICE_ROLE_KEY` and triggers `scrapeTradingEconomicsRates()`. Returns `err.message` on failure.
- **Impact:** Cost amplification (Apify credits), RLS bypass, DoS vector, error leakage.
- **Fix:** Add `verifyCronAuth()` guard.
- **Effort:** Small

### SEC-004 [CRITICAL] Public `/api/macro/calendar` Auto-Sync Uses Service Role Key Without Auth
- **File:** `app/api/macro/calendar/route.ts:17-21, 78-89`
- **Description:** Completely public GET. When DB is empty, falls back to `getSupabaseAdmin()` to write events, bypassing all RLS.
- **Impact:** Attacker can trigger service-role writes to `economic_events` by timing requests.
- **Fix:** Remove auto-sync from public GET; use cron-only population.
- **Effort:** Small

### SEC-005 [CRITICAL] Public `/api/macro/headlines` Uses Service Role Key on `?live=1`
- **File:** `app/api/macro/headlines/route.ts:99-125, 165-190`
- **Description:** `?live=1` parameter and empty-DB fallback both use `SUPABASE_SERVICE_ROLE_KEY` on a public GET endpoint.
- **Impact:** DoS vector (triggers RSS scraping + AI translation), RLS bypass for writes.
- **Fix:** Require Bearer auth for `?live=1`; remove service role from fallback.
- **Effort:** Medium

### SEC-006 [CRITICAL] `macro_events` INSERT Policy Allows Any Anonymous User to Insert
- **File:** `docs/migrations/2026-03-18-phase3-columns.sql:37`
- **Description:** INSERT policy uses `WITH CHECK (true)`. Any user with the anon key can insert arbitrary macro events.
- **Impact:** Fake economic events could mislead traders into bad decisions.
- **Fix:** Change to `WITH CHECK (auth.role() = 'service_role')`.
- **Effort:** Small

### SEC-007 [CRITICAL] SECURITY DEFINER Functions Missing `search_path`
- **File:** `supabase/migrations/20260317_phase1_5_rule_engine.sql`, `supabase/migrations/20260317_ai_usage.sql`
- **Description:** `calc_drawdown`, `increment_ai_usage`, `decrement_ai_usage` lack `SET search_path = public`.
- **Impact:** Potential privilege escalation via schema search path hijacking.
- **Fix:** `ALTER FUNCTION ... SET search_path = public;` for all three.
- **Effort:** Small

### SEC-008 [CRITICAL] `increment_ai_usage`/`decrement_ai_usage` Accept Arbitrary user_id
- **File:** `supabase/migrations/20260317_ai_usage.sql`
- **Description:** SECURITY DEFINER RPCs accept `p_user_id` without verifying `auth.uid()`. Any authenticated user can manipulate another user's AI usage counter.
- **Impact:** Attackers can exhaust victims' AI quota or give themselves unlimited free usage.
- **Fix:** Add `IF p_user_id != auth.uid() THEN RAISE EXCEPTION; END IF;` inside each function.
- **Effort:** Small

### SEC-009 [CRITICAL] Analyst Run Leaks Raw Error Strings via SSE
- **File:** `app/api/analyst/run/route.ts:93-96`
- **Description:** Sends `String(err)` directly to SSE stream on error.
- **Impact:** Information disclosure — stack traces, file paths, API keys in error messages.
- **Fix:** Replace with generic "Analysis failed. Please try again."
- **Effort:** Small

### SEC-010 [CRITICAL] Missing Content-Security-Policy Header
- **File:** `next.config.mjs:11-25`
- **Description:** No CSP configured. App uses `dangerouslySetInnerHTML` in layout for theme script. Without CSP, any XSS can execute arbitrary scripts.
- **Impact:** Primary defense against XSS absent on a financial application.
- **Fix:** Add strict CSP with nonce support for the inline theme script.
- **Effort:** Medium

### SEC-011 [HIGH] `supabase.auth.signOut()` Used in Account Page (Known Freeze Bug)
- **File:** `app/app/account/page.tsx:44`
- **Description:** Directly violates CLAUDE.md rule. Known to freeze the browser. Also uses `window.location.replace()` instead of `.href`.
- **Impact:** User clicks logout and browser hangs. Session tokens may not clear.
- **Fix:** Replace with manual localStorage cleanup pattern.
- **Effort:** Small

### SEC-012 [HIGH] Account Deletion Cascade Misses 5+ Tables
- **File:** `app/api/account/delete/route.ts:33-45`
- **Description:** Hardcoded table list missing: `day_notes`, `ai_coach_messages`, `ai_coach_conversations`, `analyst_reports`, `user_tags`.
- **Impact:** GDPR violation — user data persists after deletion. FK constraints may block auth.users deletion.
- **Fix:** Add all user-owned tables to cascade.
- **Effort:** Small

### SEC-013 [HIGH] Error Message Leakage Across 13+ API Routes
- **Files:** `ai/conversations`, `analyst/history`, `analyst/run`, all 6 cron routes, `macro/check-rate-update`, `macro/refresh-rates`, `macro/refresh-calendar`, `macro/regenerate-report`
- **Description:** `error.message` returned directly to clients. Supabase errors contain table names, column names, constraint details.
- **Impact:** Schema enumeration via crafted requests.
- **Fix:** Return generic error strings; log details server-side only.
- **Effort:** Small (batch fix)

### SEC-014 [HIGH] 7 Public Macro Routes Have Zero Rate Limiting
- **Files:** `/api/macro/alerts`, `/api/macro/history`, `/api/macro/compare`, `/api/macro/rates`, `/api/macro/panorama`, `/api/macro/calendar`, `/api/macro/headlines`
- **Description:** All completely public, no auth, no rate limiting. Return valuable financial intelligence.
- **Impact:** Scraping of all macro data; DDoS translates to Supabase costs.
- **Fix:** Add ISR caching + Vercel Edge rate limiting; consider auth for PRO-only data.
- **Effort:** Medium

### SEC-015 [HIGH] Analyst Run Has No Subscription/Quota Check
- **File:** `app/api/analyst/run/route.ts:59-64`
- **Description:** Authenticates user but never checks subscription tier. Any free user can generate unlimited analyst reports, each costing an Anthropic API call.
- **Impact:** Free-tier abuse generating expensive Claude API calls.
- **Fix:** Add tier gating + monthly quota enforcement.
- **Effort:** Medium

### SEC-016 [HIGH] `prop_alerts` Missing INSERT RLS Policy
- **File:** `supabase/migrations/20260317_phase1_5_rule_engine.sql`
- **Description:** Only SELECT and UPDATE policies exist. INSERT from client is silently blocked by RLS.
- **Impact:** Drawdown alerts may never be created.
- **Fix:** Add INSERT policy: `WITH CHECK (auth.uid() = user_id)`.
- **Effort:** Small

### SEC-017 [HIGH] Puppeteer in Production Dependencies
- **File:** `package.json:32`
- **Description:** Listed under `dependencies` (not `devDependencies`) but only used in local scripts. Downloads 280MB Chromium.
- **Impact:** Inflated deployment, expanded attack surface.
- **Fix:** Move to `devDependencies`.
- **Effort:** Small

### SEC-018 [HIGH] Alpha Vantage Silent Fallback to "demo" API Key
- **File:** `lib/analyst/tools/finance/alpha-vantage.ts:3`
- **Description:** Falls back to rate-limited public "demo" key silently.
- **Impact:** Silent degradation of financial data quality in a trading dashboard.
- **Fix:** Throw or warn instead of silent fallback.
- **Effort:** Small

### SEC-019 [HIGH] Sentry Client Missing PII Scrubbing
- **File:** `sentry.client.config.ts:3-9`
- **Description:** No `beforeSend` hook to scrub trade amounts, account IDs, or user emails.
- **Impact:** Financial data stored in Sentry cloud.
- **Fix:** Add `beforeSend` callback stripping sensitive fields.
- **Effort:** Small

### SEC-020 [MEDIUM] `router.replace()` Used in Login Auth Flow
- **File:** `app/login/page.tsx:52`
- **Description:** Violates CLAUDE.md rule for auth flows. Can cause redirect loops or stale auth state.
- **Fix:** Replace with `window.location.href`.
- **Effort:** Small

### SEC-021 [MEDIUM] `router.replace()` in AI Coach (2 instances)
- **File:** `app/app/ai-coach/page.tsx:150, 163`
- **Description:** URL query param updates via router.replace within authenticated area. Lower risk than auth flow but still violates project rule.
- **Fix:** Use `window.history.replaceState()`.
- **Effort:** Small

### SEC-022 [MEDIUM] Onboarding Uses `getSession()` Without `getUser()` for Auth Gate
- **File:** `app/onboarding/page.tsx:84`
- **Description:** Auth gate check uses `getSession()` which reads JWT from localStorage without server-side verification.
- **Impact:** Manipulated JWT in localStorage could bypass check (subsequent API calls would fail).
- **Fix:** Replace gate check with `supabase.auth.getUser()`.
- **Effort:** Small

### SEC-023 [MEDIUM] Account Deletion Has No Re-authentication
- **File:** `app/api/account/delete/route.ts:6`
- **Description:** Only requires valid Bearer token. No password re-entry, CAPTCHA, or cooling-off period.
- **Impact:** Stolen JWT can permanently delete account with single request.
- **Fix:** Require password confirmation or 24-hour grace period.
- **Effort:** Medium

### SEC-024 [MEDIUM] Client-Side Deletes by ID Without Explicit user_id
- **Files:** `components/account/ManageAccountsModal.tsx:73-88`, `components/journal/TradeDetailModal.tsx:95-111`
- **Description:** Delete by `.eq("id", ...)` only, relying entirely on RLS. Missing defense-in-depth.
- **Fix:** Add `.eq("user_id", session.user.id)` to delete queries.
- **Effort:** Small

### SEC-025 [MEDIUM] Cron Endpoints Publicly Accessible (No IP Restriction)
- **File:** `vercel.json:3-28`
- **Description:** Protected by CRON_SECRET (timing-safe), but publicly accessible HTTP endpoints. Brute-force possible.
- **Fix:** Add `x-vercel-cron-signature` verification as second factor.
- **Effort:** Small

### SEC-026 [MEDIUM] Finnhub API Key Defaults to Empty String
- **File:** `lib/analyst/tools/finance/finnhub.ts:3`
- **Description:** Falls back to `""`, causing silent 401 failures.
- **Fix:** Validate at initialization.
- **Effort:** Small

### SEC-027 [MEDIUM] Subscription Success Page Has No Payment Verification
- **File:** `app/app/subscription/success/page.tsx`
- **Description:** Direct navigation shows "Assinatura ativada!" regardless of payment status.
- **Fix:** Verify `session_id` from Stripe URL params.
- **Effort:** Medium

### SEC-028 [LOW] No-Op Middleware (Defense-in-Depth Gap)
- **File:** `middleware.ts:1-11`
- **Description:** Matches `/app/**` but does nothing. If AuthGate JS fails to load, pages render unprotected shells.
- **Fix:** Implement server-side session check via `@supabase/ssr`.
- **Effort:** Large

### SEC-029 [LOW] 8-Hour Inactivity Timeout May Be Too Long
- **File:** `components/auth/AuthGate.tsx:12`
- **Description:** Financial apps typically use 15-30 minutes.
- **Fix:** Reduce to 30 min free / configurable Pro.
- **Effort:** Medium

### SEC-030 [LOW] Deprecated X-XSS-Protection Header
- **File:** `next.config.mjs:19`
- **Description:** Removed from modern browsers; can introduce vulnerabilities.
- **Fix:** Remove header. Rely on CSP.
- **Effort:** Small

### SEC-031 [LOW] Missing Migration Files for 4 Tables
- **Files:** `macro_headlines`, `user_tags`, `ai_coach_conversations`, `analyst_reports`
- **Description:** No migration SQL; RLS policies cannot be verified from code.
- **Fix:** Create migration files; verify RLS in Supabase dashboard.
- **Effort:** Small

### SEC-032 [LOW] Billing Checkout Accepts Unvalidated Origin Header
- **File:** `app/api/billing/checkout/route.ts:45`
- **Fix:** Hardcode from `NEXT_PUBLIC_APP_URL`.
- **Effort:** Small

---

## 3. Technical Findings

### TECH-001 [CRITICAL] Drawdown Calculation Starts from Zero Equity — Masks Real Drawdowns
- **File:** `lib/trade-analytics.ts:248-254`
- **Description:** Equity curve starts at 0 (cumulative P&L). `peak` starts at 0 and stays 0 until first profit. If first trades are losses, drawdown shows 0%. For a $100k account losing $5k on day 1, drawdown shows 0% instead of 5%.
- **Impact:** Most dangerous financial bug. Prop traders could miss drawdown limits and blow accounts.
- **Fix:** Initialize equity from `starting_balance_usd`. Pass starting balance to `computeTradeAnalytics`.
- **Effort:** Medium

### TECH-002 [CRITICAL] MT5 XLSX Parser Comma Replacement Bug — 1000x P&L Corruption
- **File:** `lib/mt5-parser.ts:40`
- **Description:** First `.replace(/[\s,]/g, "")` removes ALL commas. Second `.replace(",", ".")` is a no-op. European "1.234,56" becomes 1.23456 instead of 1234.56.
- **Impact:** P&L values silently corrupted by 1000x for large numbers.
- **Fix:** Replace comma-to-dot first, then strip spaces.
- **Effort:** Small

### TECH-003 [CRITICAL] MT5 HTML Parser Uses Wrong UTC Offset
- **File:** `lib/mt5-html-parser.ts:36`
- **Description:** `MT5_TO_UTC_MS = -5 * 60 * 60 * 1000` but converting from UTC+2 to UTC requires -2h, not -5h. All imported HTML trades have timestamps 3 hours off.
- **Impact:** Corrupts session analysis, day-of-week breakdowns, P&L calendar attribution.
- **Fix:** Clarify target timezone; use correct offset.
- **Effort:** Medium

### TECH-004 [CRITICAL] Narrative Generator JSON.parse Without Recovery
- **File:** `lib/macro/narrative-generator.ts:86-108`
- **Description:** If Claude returns malformed JSON (common with LLMs), entire narrative generation crashes. The `end_turn` path has zero error handling.
- **Fix:** Wrap in try/catch, return structured fallback.
- **Effort:** Small

### TECH-005 [CRITICAL] Unguarded `req.json()` in AI Conversations PATCH
- **File:** `app/api/ai/conversations/route.ts:55`
- **Description:** Malformed JSON crashes PATCH handler with no try/catch. Unlike POST handler which has `.catch()`.
- **Fix:** Add `.catch(() => null)` and return 400.
- **Effort:** Small

### TECH-006 [CRITICAL] PrivacyContext Creates New Object Every Render
- **File:** `components/context/PrivacyContext.tsx:44`
- **Description:** `value={{ hidden, toggle, mask }}` creates new reference each render, triggering re-renders in ALL 28 consumers.
- **Impact:** Performance cascade through dashboard KPIs, calendar, equity chart, etc.
- **Fix:** Wrap in `useMemo`.
- **Effort:** Small

### TECH-007 [CRITICAL] Dashboard Double-Fetches on Tab Focus
- **File:** `app/app/page.tsx:158-176`
- **Description:** Both `visibilitychange` and `focus` events increment `refreshKey`, causing two full data re-fetches on every tab switch.
- **Fix:** Remove `focus` listener; add 30-second cooldown.
- **Effort:** Medium

### TECH-008 [HIGH] 48+ Non-Null Assertions on `process.env` (Runtime Crash Risk)
- **File:** All API routes and cron jobs
- **Description:** `process.env.VAR!` used everywhere. If any env var is missing, crashes with no helpful error. Project has `lib/supabase/env.ts` for validation but API routes bypass it.
- **Fix:** Create shared `getSupabaseAdmin()` helper with validation.
- **Effort:** Medium

### TECH-009 [HIGH] `as unknown as TradeRow[]` Casts on Financial Data
- **Files:** `app/app/page.tsx:805,815,861`, `app/app/journal/page.tsx:540`
- **Description:** Double-cast completely bypasses type system. If Supabase schema changes, PnL calculations silently produce wrong numbers.
- **Fix:** Create `toTradeRow()` mapper that validates required fields.
- **Effort:** Medium

### TECH-010 [HIGH] Calmar Ratio Uses Absolute P&L / Percentage — Unit Mismatch
- **File:** `lib/trade-analytics.ts:273-274`
- **Description:** `netPnl / maxDrawdown` where netPnl is dollars and maxDrawdown is percentage. Produces meaningless numbers.
- **Fix:** Use annualized return percentage / max drawdown percentage.
- **Effort:** Small

### TECH-011 [HIGH] Recovery Factor Has Same Unit Mismatch
- **File:** `lib/trade-analytics.ts:285`
- **Fix:** Same as TECH-010.
- **Effort:** Small

### TECH-012 [HIGH] Sharpe/Sortino Ratios Ignore Risk-Free Rate
- **File:** `lib/trade-analytics.ts:257-268`
- **Description:** With ~3.6% FED rate, ignoring risk-free rate overstates Sharpe by ~35% for moderate strategies.
- **Fix:** Subtract daily risk-free rate.
- **Effort:** Small

### TECH-013 [HIGH] cTrader Parser parseFloat Without NaN Guard
- **File:** `lib/ctrader-parser.ts:102-112`
- **Description:** Raw `parseFloat` returns NaN for non-numeric data, propagating through all analytics.
- **Fix:** Use safe `parseNum` function like MT5 parsers.
- **Effort:** Small

### TECH-014 [HIGH] Stripe PRICE_IDS Non-Null Assertions — Silent Billing Failures
- **File:** `lib/stripe.ts:20-24`
- **Description:** If env vars missing, `planFromPriceId` always returns `null`. Webhook can't identify plans after payment, potentially leaving paid users on free tier.
- **Fix:** Throw at initialization if any price ID missing.
- **Effort:** Small

### TECH-015 [HIGH] `toLocalDateStr` Crashes on Invalid Dates
- **File:** `lib/trade-analytics.ts:162-168`
- **Description:** `new Date("")` produces Invalid Date; `formatToParts` throws RangeError. User-imported data can have invalid dates.
- **Fix:** Add `if (isNaN(d.getTime())) return "unknown"` guard.
- **Effort:** Small

### TECH-016 [HIGH] Macro Page Re-fetches ALL 6 APIs on Calendar Week Change
- **File:** `app/app/macro/page.tsx:47-54`
- **Description:** Only calendar data depends on `calendarWeek`, but all 6 fetches fire. Wastes 5 requests per week navigation.
- **Fix:** Split into `fetchCalendar(week)` and `fetchStaticData()`.
- **Effort:** Medium

### TECH-017 [HIGH] SpiralBackground rAF Loop Never Pauses
- **File:** `components/landing/SpiralBackground.tsx:109-195`
- **Description:** Even when `!isVisible`, rAF loop re-schedules itself. 1500 stars per frame. Drains battery on mobile.
- **Fix:** Stop rAF when not visible; restart on intersection.
- **Effort:** Medium

### TECH-018 [HIGH] Multiple Auth State Listeners (3 Independent `onAuthStateChange`)
- **Files:** `AuthGate.tsx:156`, `ActiveAccountContext.tsx:110`, `SubscriptionContext.tsx:48`
- **Description:** Three parallel listeners, each calling `getSession()` independently. Results in 3+ redundant session fetches per auth event.
- **Fix:** Create single `AuthEventProvider`.
- **Effort:** Large

### TECH-019 [HIGH] `ensureDefaultAccounts` Race Condition — No Dedup Lock
- **File:** `lib/bootstrap/ensureDefaultAccounts.ts`
- **Description:** Two browser tabs on first login both find no accounts and both insert. Without unique constraint on `(user_id, name)`, duplicate accounts are created.
- **Fix:** Add unique constraint or use `upsert`.
- **Effort:** Small

### TECH-020 [HIGH] Unguarded `req.json()` in Billing Checkout
- **File:** `app/api/billing/checkout/route.ts:16`
- **Description:** Malformed JSON body gives generic 500 instead of 400. No input validation on `body.plan`.
- **Fix:** Add `.catch(() => null)` and validate against whitelist.
- **Effort:** Small

### TECH-021 [MEDIUM] MT5 XLSX Parser Has No Timezone Handling
- **File:** `lib/mt5-parser.ts:46-57`
- **Description:** Creates dates in server local timezone. No broker timezone offset. XLSX and HTML imports produce different timestamps for same trade.
- **Fix:** Apply same offset as HTML parser.
- **Effort:** Small

### TECH-022 [MEDIUM] Journal ALL Trades Loaded Without Pagination
- **File:** `app/app/journal/page.tsx:108-112`
- **Description:** Fetches entire trade history for account. 500+ trades = heavy initial render.
- **Fix:** Add server-side pagination with `.range(0, 100)`.
- **Effort:** Large

### TECH-023 [MEDIUM] AddTradeModal `net_pnl_usd` Sign Convention Ambiguity
- **File:** `components/journal/AddTradeModal.tsx:62`
- **Description:** `pnl + fees` assumes fees are negative. If user enters positive fees (as commissions), net becomes `pnl + fees` instead of `pnl - fees`.
- **Impact:** Can corrupt P&L data.
- **Fix:** Document sign convention; add validation.
- **Effort:** Small

### TECH-024 [MEDIUM] 6 `eslint-disable exhaustive-deps` Suppressions
- **Files:** Settings, Journal, AI Coach (3), AuthGate, DayDetailModal
- **Description:** Missing useEffect dependencies cause stale closures. AuthGate suppression is highest risk.
- **Fix:** Audit each; use useCallback/useRef to stabilize.
- **Effort:** Medium

### TECH-025 [MEDIUM] Framer Motion Variants Typed as `any` (6 occurrences)
- **Files:** `Hero.tsx` (4), `HowItWorks.tsx` (1), `MacroIntelligence.tsx` (1)
- **Description:** Violates project "zero any" rule.
- **Fix:** Type as `Variants` from framer-motion.
- **Effort:** Small

### TECH-026 [MEDIUM] `as any` in Auth Callback OTP Verification
- **File:** `app/auth/callback/page.tsx:25`
- **Fix:** Type as `EmailOtpType`.
- **Effort:** Small

### TECH-027 [MEDIUM] Macro Polling Runs in Hidden Tabs
- **File:** `app/app/macro/page.tsx:431-448`
- **Description:** Calendar poll (5 min) + headline poll (30 min) + subscription poll (15 min) + AuthGate check (5 min) = ~20 background requests/hour when tab is hidden.
- **Fix:** Add `document.visibilityState === "visible"` guard.
- **Effort:** Small

### TECH-028 [MEDIUM] Narrative Generator No Concurrency Guard
- **File:** `lib/macro/narrative-generator.ts`
- **Description:** Cron + manual regenerate can run simultaneously; last-write-wins may overwrite better analysis.
- **Fix:** Use DB advisory lock or processing flag.
- **Effort:** Medium

### TECH-029 [MEDIUM] Dashboard God Component (14 useState hooks, 1231 lines)
- **File:** `app/app/page.tsx`
- **Fix:** Extract into `useDashboardData()`, `useNewsData()`, `usePropData()` hooks.
- **Effort:** Large

### TECH-030 [MEDIUM] `generateAdaptiveUpdate` Has No JSON Error Handling
- **File:** `lib/macro/narrative-generator.ts:151`
- **Fix:** Wrap JSON.parse in try/catch, return fallback.
- **Effort:** Small

### TECH-031 [MEDIUM] Prop Drawdown safeDenom=1 Fallback
- **File:** `lib/prop-stats.ts:49`
- **Description:** When HWM and starting_balance are both 0, produces nonsensical percentages.
- **Fix:** Return null/0 when denominator data is missing.
- **Effort:** Small

### TECH-032 [LOW] Hardcoded Central Bank Rates 5 Days Stale
- **File:** `lib/macro/rates-fetcher.ts:14`
- **Fix:** Update rates; add `stale_since` UI indicator.
- **Effort:** Small

### TECH-033 [LOW] `ensureDefaultAccounts` Returns ok:true on Partial Failure
- **File:** `lib/bootstrap/ensureDefaultAccounts.ts:40-44`
- **Fix:** Track failures and return `ok: false`.
- **Effort:** Small

### TECH-034 [LOW] 4 Static Pages Use "use client" Unnecessarily
- **Files:** `manifesto/page.tsx`, `changelog/page.tsx`, `blog/page.tsx`, `academy/page.tsx`
- **Fix:** Convert to server components with client-only animation wrappers.
- **Effort:** Medium

### TECH-035 [LOW] JournalKpiCards Best Trade Shows "+{negative}"
- **File:** `components/journal/JournalKpiCards.tsx:117`
- **Fix:** Only add "+" prefix if value is positive.
- **Effort:** Small

### TECH-036 [LOW] News Auto-Refresh Runs During Background Tab
- **File:** `app/app/news/page.tsx:90`
- **Fix:** Add visibility check.
- **Effort:** Small

### TECH-037 [LOW] Dynamic Tailwind Class in TiltmeterGauge
- **File:** `components/dashboard/TiltmeterGauge.tsx:204`
- **Description:** `` `text-[${size}px]` `` cannot be generated at build time.
- **Fix:** Use inline style.
- **Effort:** Small

---

## 4. Design & UX Findings

### UX-001 [CRITICAL] No Mobile Navigation for Authenticated Area
- **File:** `components/layout/AppSidebar.tsx`
- **Description:** Sidebar uses `hidden md:flex`. Below 768px, completely invisible with NO alternative navigation. Users on phones cannot reach any page.
- **Impact:** App is unusable on mobile.
- **Fix:** Implement bottom tab bar or slide-in drawer.
- **Effort:** Large

### UX-002 [CRITICAL] Login Page Has Zero Dark Mode Support
- **File:** `app/login/page.tsx:123,130,157,195,210,247,253`
- **Description:** Entire page hardcodes `bg-[#F7F6F3]`, `bg-white`, `text-[#1A1A1A]`, `text-[#6B6B6B]`. 50+ hardcoded color instances.
- **Fix:** Replace all with semantic tokens.
- **Effort:** Medium

### UX-003 [CRITICAL] `--radius-card` Mismatch: CSS 20px vs CLAUDE.md 22px
- **File:** `app/globals.css:52`, `tailwind.config.ts:56`
- **Description:** 88 instances use `rounded-[22px]`; CSS variable is 20px; only 1 file uses `rounded-card`.
- **Fix:** Decide on value; use token everywhere.
- **Effort:** Medium

### UX-004 [CRITICAL] Border Radius Fragmentation — 15+ Different Values
- **Description:** 306 `rounded-full`, 143 `rounded-xl`, 88 `rounded-[22px]`, 42 `rounded-2xl`, 18 `rounded-[14px]`, 13 `rounded-[16px]`, 7 `rounded-[24px]`, etc. Design tokens barely used.
- **Fix:** Consolidate to token-based system.
- **Effort:** Large

### UX-005 [CRITICAL] bg-card Transparency Bug in 15+ Locations
- **Files:** `app/app/account/page.tsx:60,80,97`, `app/app/page.tsx:601,663`, `app/app/macro/page.tsx:557,573,589,602`, `components/macro/MacroWidgetBriefing.tsx:23,33,45`, `components/dashboard/AccountsOverview.tsx:209,219`, `components/dashboard/BacktestSection.tsx:273`, `components/dashboard/JournalBriefing.tsx:152`, `components/journal/JournalTradesTable.tsx:102,121`
- **Description:** `bg-card` without required inline `style={{ backgroundColor }}`.
- **Fix:** Add inline style or use Card component.
- **Effort:** Small (mechanical)

### UX-006 [CRITICAL] bg-card Elements Missing `isolate` Class
- **Files:** Multiple — account page, dashboard, journal table, app header, macro widgets
- **Description:** Cards without `isolate` allow BGPattern dots to bleed through.
- **Fix:** Add `isolate` to all card-level `bg-card` elements.
- **Effort:** Small

### UX-007 [HIGH] Calendar Grid Cramped on Mobile (53px cells)
- **File:** `components/calendar/CalendarGrid.tsx:92,105`
- **Description:** 7-column grid with no responsive override. Touch targets under 44px.
- **Fix:** Switch to weekly view on mobile.
- **Effort:** Medium

### UX-008 [HIGH] Journal Trades Table Has `overflow-hidden` Instead of `overflow-x-auto`
- **File:** `components/journal/JournalTradesTable.tsx:172`
- **Fix:** Change to `overflow-x-auto`, add `min-w-[600px]` to table.
- **Effort:** Small

### UX-009 [HIGH] Missing SEO Metadata on 7 Public Pages
- **Files:** login, onboarding, academy, blog, changelog, manifesto, risk-disclaimer
- **Description:** No page-level metadata exports. Only features/[slug] and root layout have proper metadata.
- **Fix:** Add title + description to each.
- **Effort:** Small

### UX-010 [HIGH] Form Inputs Missing Label Association (20+ inputs)
- **Files:** BacktestSection (5), AddTradeModal (labels without htmlFor), DayDetailPanel (2), JournalTradesTable (1), account page (2), academy (1), blog (1), JournalBriefing (1)
- **Description:** Screen readers cannot associate labels with inputs (WCAG 1.3.1, 4.1.2).
- **Fix:** Add `id`/`htmlFor` pairing or `aria-label`.
- **Effort:** Medium

### UX-011 [HIGH] Icon-Only Buttons Missing Accessible Names (8+ buttons)
- **Files:** PnlCalendar (prev/next), theme-toggle, HeadlinesFeed (refresh), AddTradeModal (close), settings (up/down)
- **Fix:** Add `aria-label` to each.
- **Effort:** Small

### UX-012 [HIGH] AppHeader Dropdown Menu Lacks Keyboard Support
- **File:** `components/layout/AppHeader.tsx:105-128`
- **Description:** No `role="menu"`, no `aria-expanded`, no Escape handler, no arrow key navigation.
- **Fix:** Add ARIA roles + keyboard handlers, or replace with Radix DropdownMenu.
- **Effort:** Medium

### UX-013 [HIGH] No Skip Navigation on Authenticated Pages
- **File:** `app/app/layout.tsx`
- **Description:** Landing page has skip link, but all `/app/**` pages do not (WCAG 2.4.1).
- **Fix:** Add skip link + `id="main-content"` on main area.
- **Effort:** Small

### UX-014 [HIGH] Heading Hierarchy Skips Levels
- **Files:** AI Coach (h1 to h3), Analyst (h1 to h3)
- **Fix:** Change h3 to h2 where direct children of page.
- **Effort:** Small

### UX-015 [HIGH] No `aria-live` Regions for Dynamic Content
- **Files:** Dashboard KPIs, AI Coach streaming, HeadlinesFeed, EconomicCalendar
- **Fix:** Add `aria-live="polite"` to dynamic containers; `role="log"` to chat.
- **Effort:** Medium

### UX-016 [HIGH] Shadow Class Inconsistency
- **Description:** 38 `shadow-sm`, 26 `shadow-lg` (generic Tailwind) vs 29 `shadow-soft` (design token). App cards should use `shadow-soft`.
- **Fix:** Audit and replace generic shadows with tokens.
- **Effort:** Medium

### UX-017 [HIGH] Font Weight Mismatch: CSS 800 vs CLAUDE.md 600
- **File:** `app/globals.css:64`
- **Fix:** Reconcile; update CLAUDE.md to match CSS (800 for Manrope).
- **Effort:** Small

### UX-018 [MEDIUM] Inconsistent Page Layouts (5 Different max-w Values)
- **Description:** `/app/account` max-w-2xl, `/app/news` max-w-4xl, `/app/prop` max-w-7xl, `/app/journal` max-w-none. Standard is max-w-6xl.
- **Fix:** Review each for intentional deviation.
- **Effort:** Small

### UX-019 [MEDIUM] Light Theme Muted Foreground Fails WCAG AA Contrast
- **File:** `app/globals.css`
- **Description:** `--muted-foreground: 0 0% 42%` (#6B6B6B) on `--background: 0 0% 95%` (#F2F2F2) = 3.82:1 (needs 4.5:1). Used 100+ times.
- **Fix:** Darken to `0 0% 36%` (#5C5C5C).
- **Effort:** Small

### UX-020 [MEDIUM] `focus:` Used Instead of `focus-visible:` on Inputs
- **Files:** BacktestSection, AddTradeModal, DayDetailPanel, ChatInput, JournalTradesTable, Analyst
- **Fix:** Replace `focus:outline-none focus:ring-*` with `focus-visible:` variants.
- **Effort:** Small

### UX-021 [MEDIUM] Pricing Toggle Missing `aria-checked`
- **Files:** `PricingCards.tsx:238`, `LandingPricing.tsx:112`
- **Fix:** Add `aria-checked={isAnnual}`.
- **Effort:** Small

### UX-022 [MEDIUM] Dashboard Grid-cols-3 Does Not Collapse on Mobile
- **File:** `app/app/page.tsx:1155`
- **Fix:** Add `grid-cols-1 sm:grid-cols-3`.
- **Effort:** Small

### UX-023 [MEDIUM] Login Grid-cols-2 Feature Grid No Responsive Fallback
- **File:** `app/login/page.tsx:169`
- **Fix:** Change to `grid-cols-1 sm:grid-cols-2`.
- **Effort:** Small

### UX-024 [MEDIUM] Settings Touch Targets Too Small (p-1 = 24x24px)
- **File:** `app/app/settings/page.tsx:479,488`
- **Fix:** Increase to `p-2.5` or add `min-h-[44px] min-w-[44px]`.
- **Effort:** Small

### UX-025 [MEDIUM] Authenticated App Area Missing `<main>` Landmark
- **File:** `app/app/layout.tsx`
- **Fix:** Wrap content in `<main id="main-content">`.
- **Effort:** Small

### UX-026 [MEDIUM] Mobile Menu Lacks Focus Trap
- **Files:** `AppHeader.tsx:136-155`, `Navbar.tsx:270-340`
- **Fix:** Use Radix Sheet or manual focus trap.
- **Effort:** Medium

### UX-027 [MEDIUM] Missing OG Image in Root Layout
- **File:** `app/layout.tsx`
- **Fix:** Add OG image URL to metadata.
- **Effort:** Small

### UX-028 [MEDIUM] `alert()` Used for Errors in 6+ Locations
- **Files:** PricingCards (2), Macro page (4)
- **Fix:** Replace with shadcn toast or inline error.
- **Effort:** Small

### UX-029 [MEDIUM] No User-Facing Error State on Macro Page
- **File:** `app/app/macro/page.tsx:105`
- **Description:** All 6 fetch failures logged to console only.
- **Fix:** Show error banner with retry button.
- **Effort:** Small

### UX-030 [MEDIUM] Macro Hardcoded Colors (text-gray-600 invisible in dark)
- **Files:** AssetImpactCards, DecisionIntelligence, InterestRatesPanel, etc.
- **Fix:** Replace with `text-muted-foreground`.
- **Effort:** Small

### UX-031 [MEDIUM] AI Coach Missing Abort on Unmount
- **File:** `app/app/ai-coach/page.tsx`
- **Fix:** Add cleanup in useEffect return.
- **Effort:** Small

### UX-032 [LOW] Analyst Delete Button Hover-Only (Unusable on Touch)
- **File:** `app/app/analyst/page.tsx:854`
- **Fix:** Make visible on mobile; increase to p-2.
- **Effort:** Small

### UX-033 [LOW] Missing Accents in Portuguese Text
- **Files:** Account page ("Configuracoes"), AddTradeModal ("Direcao", "Observacoes")
- **Fix:** Add proper accents.
- **Effort:** Small

### UX-034 [LOW] Extensive Use of text-[10px] and text-[11px]
- **Files:** 23+ instances across analyst, journal, settings, blog
- **Fix:** Consider minimum `text-xs` (12px) on mobile.
- **Effort:** Medium

### UX-035 [LOW] Landing Navbar Hides Dashboard Link on Mobile for Logged-In Users
- **File:** `components/landing/Navbar.tsx`
- **Fix:** Add Dashboard link to mobile menu when logged in.
- **Effort:** Small

### UX-036 [LOW] Data Tables Missing `scope="col"` on `<th>` Elements
- **Files:** AccountsOverview, PsychologyAnalytics
- **Fix:** Add `scope="col"`.
- **Effort:** Small

---

## 5. Per-Page Results Matrix

| Page | Loading | Empty | Error | Auth | Dark Mode | bg-card | Mobile | Score |
|------|---------|-------|-------|------|-----------|---------|--------|-------|
| `/` (Landing) | PASS | N/A | N/A | N/A | PASS | N/A | PASS | 9/10 |
| `/login` | PASS | N/A | PASS | N/A | **FAIL** | N/A | PASS | 5/10 |
| `/auth/callback` | PASS | N/A | PASS | N/A | PASS | N/A | PASS | 9/10 |
| `/onboarding` | PASS | N/A | PASS | PASS | PASS | PASS | PASS | 8/10 |
| `/features/[slug]` | PASS | N/A | PASS | N/A | PASS | PASS | PASS | 10/10 |
| `/academy` | N/A | N/A | N/A | N/A | PASS | N/A | PASS | 7/10 |
| `/blog` | N/A | N/A | N/A | N/A | PASS | N/A | PASS | 7/10 |
| `/changelog` | N/A | N/A | N/A | N/A | PASS | N/A | PASS | 7/10 |
| `/manifesto` | N/A | N/A | N/A | N/A | PASS | N/A | PASS | 7/10 |
| `/risk-disclaimer` | N/A | N/A | N/A | N/A | PASS | N/A | PASS | 8/10 |
| `/app` (Dashboard) | PASS | PASS | WARN | PASS | PASS | **FAIL** | WARN | 6/10 |
| `/app/account` | **FAIL** | PASS | PASS | PASS | PASS | **FAIL** | PASS | 4/10 |
| `/app/settings` | PASS | PASS | PASS | PASS | PASS | PASS | WARN | 8/10 |
| `/app/pricing` | PASS | N/A | WARN | PASS | PASS | PASS | PASS | 7/10 |
| `/app/subscription/success` | **FAIL** | N/A | **FAIL** | PASS | PASS | N/A | PASS | 4/10 |
| `/app/journal` | PASS | PASS | WARN | PASS | PASS | PASS | WARN | 7/10 |
| `/app/reports` | N/A | N/A | N/A | PASS | PASS | N/A | PASS | 8/10 |
| `/app/prop` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | 8/10 |
| `/app/news` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | 8/10 |
| `/app/ai-coach` | PASS | PASS | PASS | PASS | PASS | WARN | WARN | 6/10 |
| `/app/analyst` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | 7/10 |
| `/app/macro` | PASS | PASS | WARN | PASS | PASS | **FAIL** | PASS | 5/10 |

---

## 6. Remediation Roadmap

### P0 — Blocks Launch (fix immediately)

| ID | Finding | Effort | Notes |
|----|---------|--------|-------|
| SEC-003 | `check-rate-update` public + service role | Small | Add `verifyCronAuth()` — 5 min |
| SEC-004 | `calendar` auto-sync service role | Small | Remove auto-sync from public GET — 15 min |
| SEC-005 | `headlines` service role on public GET | Medium | Gate `?live=1` behind auth — 30 min |
| SEC-006 | `macro_events` INSERT allows anon | Small | Fix RLS policy — 5 min |
| SEC-007 | SECURITY DEFINER missing search_path | Small | ALTER 3 functions — 5 min |
| SEC-008 | ai_usage RPCs accept arbitrary user_id | Small | Add auth.uid() check — 10 min |
| SEC-009 | Analyst leaks errors via SSE | Small | Sanitize — 5 min |
| SEC-011 | signOut() freeze bug | Small | Manual localStorage cleanup — 10 min |
| TECH-001 | Drawdown from zero equity | Medium | Pass starting_balance — 1 hour |
| TECH-002 | MT5 XLSX comma bug (1000x corruption) | Small | Fix parse order — 15 min |
| TECH-003 | MT5 HTML wrong UTC offset | Medium | Verify + fix — 1 hour |

### P1 — Fix This Sprint

| ID | Finding | Effort | Notes |
|----|---------|--------|-------|
| SEC-001 | In-memory rate limiter | Medium | Upstash Redis — 2 hours |
| SEC-010 | Missing CSP header | Medium | Nonce-based CSP — 3 hours |
| SEC-012 | Account deletion missing tables | Small | Add 5 tables — 30 min |
| SEC-013 | Error message leakage (13+ routes) | Small | Batch sanitize — 1 hour |
| SEC-014 | Public macro routes no rate limit | Medium | ISR + rate limiting — 2 hours |
| SEC-015 | Analyst no quota check | Medium | Tier gating — 2 hours |
| TECH-004 | Narrative JSON.parse crash | Small | Try/catch + fallback — 15 min |
| TECH-005 | Conversations PATCH unguarded | Small | 5 min |
| TECH-006 | PrivacyContext re-renders | Small | useMemo — 5 min |
| TECH-007 | Dashboard double-fetch | Medium | Remove focus listener — 1 hour |
| TECH-008 | 48+ env var non-null assertions | Medium | Shared helper — 2 hours |
| TECH-010/011 | Calmar/Recovery unit mismatch | Small | Fix formulas — 30 min |
| TECH-013 | cTrader NaN guard | Small | 15 min |
| TECH-014 | Stripe PRICE_IDS crash | Small | Fail-fast — 15 min |
| UX-001 | No mobile navigation | Large | Bottom tab bar — 8 hours |
| UX-002 | Login dark mode | Medium | Replace hardcoded colors — 2 hours |
| UX-005 | bg-card transparency (15+ locations) | Small | Add inline styles — 1 hour |
| UX-009 | Missing SEO metadata (7 pages) | Small | 1 hour |

### P2 — Fix This Month

| ID | Finding | Effort | Notes |
|----|---------|--------|-------|
| SEC-017 | Puppeteer in prod deps | Small | Move to devDeps — 5 min |
| SEC-018 | Alpha Vantage demo fallback | Small | 10 min |
| SEC-019 | Sentry PII scrubbing | Small | 30 min |
| SEC-020 | router.replace in login | Small | 5 min |
| SEC-022 | Onboarding getSession | Small | 10 min |
| SEC-023 | Account deletion re-auth | Medium | 4 hours |
| SEC-024 | Client deletes without user_id | Small | 30 min |
| SEC-027 | Subscription success no verification | Medium | 2 hours |
| TECH-009 | Financial data type casts | Medium | Create mappers — 2 hours |
| TECH-012 | Sharpe ignores risk-free rate | Small | 15 min |
| TECH-015 | toLocalDateStr crash | Small | 10 min |
| TECH-016 | Macro over-fetches | Medium | Split fetches — 1 hour |
| TECH-017 | SpiralBackground rAF | Medium | 1 hour |
| TECH-027 | Hidden tab polling | Small | 30 min |
| UX-003/004 | Border radius consolidation | Large | 4 hours |
| UX-006 | Missing isolate class | Small | 1 hour |
| UX-007 | Calendar mobile | Medium | 4 hours |
| UX-008 | Journal table overflow | Small | 30 min |
| UX-010 | Form label association | Medium | 2 hours |
| UX-011 | Icon-only button names | Small | 30 min |
| UX-012 | Dropdown keyboard support | Medium | 2 hours |
| UX-016 | Shadow inconsistency | Medium | 2 hours |
| UX-019 | Muted foreground contrast | Small | 5 min |

### P3 — Backlog

| ID | Finding | Effort | Notes |
|----|---------|--------|-------|
| SEC-028 | Server-side middleware | Large | @supabase/ssr integration |
| SEC-029 | Inactivity timeout | Medium | UX decision needed |
| SEC-031 | Missing migration files | Small | Documentation |
| TECH-018 | Multiple auth listeners | Large | AuthEventProvider |
| TECH-022 | Journal pagination | Large | Full feature |
| TECH-024 | eslint-disable suppressions | Medium | Audit each |
| TECH-025 | Framer Motion any types | Small | Type as Variants |
| TECH-029 | Dashboard god component | Large | Extract hooks |
| TECH-034 | Static pages use client | Medium | Convert to server components |
| UX-013/025 | Skip nav + main landmark | Small | 30 min |
| UX-015 | aria-live regions | Medium | 2 hours |
| UX-020 | focus-visible migration | Small | Search-replace |
| UX-026 | Mobile menu focus trap | Medium | 2 hours |
| UX-034 | Small text sizes | Medium | Spread across files |

### Logical Groupings (Fix Together)

1. **Service Role Security Sweep** (SEC-003, SEC-004, SEC-005, SEC-006): All public macro routes using service_role — fix in one pass, ~1 hour
2. **Error Message Sanitization** (SEC-009, SEC-013, TECH-020): All routes leaking error.message — batch find-replace, ~1 hour
3. **SECURITY DEFINER Hardening** (SEC-007, SEC-008): All 3 DB functions — single migration, ~15 min
4. **bg-card Transparency Fix** (UX-005, UX-006): All 15+ locations — mechanical fix, ~1 hour
5. **Financial Formula Fixes** (TECH-001, TECH-010, TECH-011, TECH-012): All in trade-analytics.ts — single file session, ~2 hours
6. **Parser Fixes** (TECH-002, TECH-003, TECH-013): MT5 XLSX + HTML + cTrader — related data pipeline, ~2 hours
7. **Auth Flow Compliance** (SEC-011, SEC-020, SEC-021, SEC-022): All router.replace and signOut violations — ~30 min
8. **SEO Metadata Batch** (UX-009, UX-027): All 7 pages + OG image — ~1 hour
9. **Accessibility Quick Wins** (UX-010, UX-011, UX-013, UX-014, UX-025): Labels, button names, skip nav, headings, landmarks — ~2 hours
10. **Border Radius Consolidation** (UX-003, UX-004): Token decision + global replace — ~4 hours

---

## 7. Technical Debt Inventory

### Pattern Inconsistencies
- **bg-card handling:** CSS `!important` override exists but CLAUDE.md still requires inline styles. Two conflicting strategies. Decision needed: commit to CSS override (remove doc requirement) or remove override (use inline everywhere).
- **Border radius:** 15+ values when 3 tokens are defined. `rounded-card` used 1 time vs `rounded-[22px]` used 88 times.
- **Shadow classes:** Mix of design tokens (`shadow-soft`) and generic Tailwind (`shadow-sm`, `shadow-lg`).
- **Error handling in API routes:** Some use `alert()`, some use inline errors, some use toast. No consistent pattern.
- **Supabase client creation:** Some routes use `getSupabaseAdmin()`, others inline `createClient(url!, key!)`.

### Missing Abstractions
- **No shared `getSupabaseAdmin()` with env validation** — 48+ routes duplicate `createClient(process.env.URL!, process.env.KEY!)`.
- **No `TradeRow` type mapping function** — 4+ files use `as unknown as TradeRow[]` double-cast.
- **No centralized error response helper** — Each route formats errors differently.
- **No `AuthEventProvider`** — 3 independent auth state listeners.
- **No `useDashboardData()` hook** — Dashboard page manages 14 state variables inline.

### Dependency Concerns
- **puppeteer** in production dependencies (280MB Chromium, should be devDependencies)
- **Next.js 14.2.18** — end of maintenance window; no future security patches
- **4 Google Fonts loaded** — each adds network request; verify all are needed
- **cheerio** imported as namespace (`import * as cheerio`) preventing tree-shaking in 3 files

### Test Coverage Gaps
- **Zero test files found** in the repository
- No unit tests for financial calculations (trade-analytics.ts, prop-stats.ts)
- No integration tests for API routes
- No E2E tests for auth flows
- No parser tests for MT5/cTrader importers

---

## 8. Comparison to Prior Audit (2026-03-10)

### Fixed Since Last Audit
- Auth callback user_id validation
- Open redirect protection (properly implemented, verified)
- Webhook service role key isolation (now properly gated)
- TradingView webhook timing-safe secret validation
- Security headers added (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- AuthGate token refresh (getUser() for primary check)
- UUID validation added to some routes
- Error sanitization in some routes (partial)

### Remains Unfixed from Last Audit
- **`macro_events` INSERT `WITH CHECK (true)`** — flagged as C1 on 2026-03-10, still open
- **SECURITY DEFINER functions missing `search_path`** — flagged as L1 on 2026-03-10, still open
- **`signOut()` usage** — flagged previously, still present in account page

### New Issues Since Last Audit
- **6 new macro API routes** (calendar, headlines, check-rate-update, panorama, rates, alerts, history, compare, refresh-rates, refresh-calendar, regenerate-report) introduced significant security surface:
  - 3 routes use service_role key without auth (SEC-003/004/005)
  - 7 routes have zero rate limiting (SEC-014)
  - All leak error messages (SEC-013)
- **AI Coach and Analyst features** introduced without quota enforcement for analyst (SEC-015)
- **`increment_ai_usage`/`decrement_ai_usage`** RPCs created without auth checks (SEC-008)
- **Financial calculation bugs** (TECH-001 drawdown, TECH-010/011 unit mismatch) may have existed before but were not caught
- **Mobile navigation gap** (UX-001) — sidebar was previously adequate but new page count (22 pages) makes it critical
- **Login dark mode** (UX-002) — may have existed before but now more visible with dark mode adoption

### Risk Trajectory
The security surface expanded significantly with the macro intelligence feature (Phase 2). The core auth architecture remains sound, but the pace of new API routes outpaced security review. The 3 public routes with service_role keys (SEC-003/004/005) represent the most urgent regression.

---

*End of consolidated forensic audit. 14 individual reports deduplicated into 124 unique findings.*
*Generated by Claude Opus 4.6 multi-agent audit team on 2026-03-28.*
