# Forensic Audit: AI & Macro Intelligence Pages
**Date:** 2026-03-28
**Auditor:** Code Quality Analyzer

---

## Page 1: AI Coach — `/app/ai-coach`
**File:** `app/app/ai-coach/page.tsx` (790 lines)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Loading state | PASS | Loader2 spinner while history/usage/conversations load (line 702-706) |
| 2 | Empty state | PASS | Greeting + insight buttons when no messages (line 707-736) |
| 3 | Error state | PASS | Handles quota_exceeded, daily_quota_exceeded, rate_limited, generic errors (lines 482-500) |
| 4 | Auth gated | PASS | Parent layout wraps all `/app/**` in AuthGate |
| 5 | Dark mode | PASS | Uses semantic tokens (text-foreground, text-muted-foreground, border-border) throughout |
| 6 | bg-card bug | WARN | Uses `bg-card/60` and `bg-card/40` (opacity variants) — these are NOT the same as bare `bg-card`. The opacity variants with `backdrop-blur` are intentional glass effects, BUT they will still be transparent if --card is transparent. No inline style fallback. |
| 7 | Performance | PASS | SSE streaming with AbortController; messages capped at 50 (MAX_HISTORY); useMemo for analytics |
| 8 | Tier gating | PASS | PaywallGate wraps left pane (line 521); quota check blocks sending (line 359) |
| 9 | Rate limiting UX | PASS | Shows "Muitas requisicoes. Aguarde um momento." for rate_limited (line 489) |
| 10 | Mobile | WARN | Left pane hidden on mobile (`hidden lg:flex` line 511) — chat works but no quick actions or conversation sidebar on small screens |

### Issues Found

- **[HIGH] router.replace() violation** (lines 150, 163): Uses `router.replace()` in conversation initialization. CLAUDE.md explicitly states: "NEVER use `router.replace()` in auth flows — use `window.location.href`". While this is not strictly an auth flow, it follows the same anti-pattern that caused infinite loops. Should use `router.push()` (already used elsewhere at line 324) or `window.location.href` for the initial redirect.

- **[MEDIUM] bg-card transparency risk** (lines 545, 577, 610, 636, 652, 728): Multiple elements use `bg-card/60` or `bg-card/40` without inline `style={{ backgroundColor }}` fallback. Per CLAUDE.md: "bg-card class alone is NOT reliable". The `/60` opacity variants compound the problem.

- **[MEDIUM] No abort on unmount**: `abortRef` is used for cancellation but there is no cleanup in a useEffect return to abort streaming if the user navigates away mid-stream. The AbortController at line 388 could leak.

- **[LOW] Missing conversation delete**: Users can create and switch conversations but cannot delete them from the sidebar. Only "Novo chat" is available.

- **[LOW] No mobile conversation switcher**: On screens < lg, the entire left panel (including conversation history, quick actions, deep insights) is hidden. No hamburger menu or drawer alternative.

- **[LOW] Empty catch at line 460**: `try { JSON.parse } catch {}` silently swallows parse errors in the SSE stream without any logging.

---

## Page 2: Trade Analyst — `/app/analyst`
**File:** `app/app/analyst/page.tsx` (~895 lines)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Loading state | PASS | CpuArchitecture animation + Loader2 + status text (lines 804-812) |
| 2 | Empty state | PASS | Clean empty state with suggested tickers (lines 873-894) |
| 3 | Error state | PASS | Red error banner (lines 815-819); handles stream errors (line 718) |
| 4 | Auth gated | PASS | Parent layout AuthGate + PaywallGate requiredPlan="ultra" (line 726) |
| 5 | Dark mode | PASS | Semantic tokens throughout; dark: variants used correctly |
| 6 | bg-card bug | PASS | All card containers use inline `style={{ backgroundColor: "hsl(var(--card))" }}` correctly |
| 7 | Performance | PASS | SSE streaming for analysis; history loaded once via useCallback |
| 8 | Tier gating | PASS | Wrapped in `PaywallGate requiredPlan="ultra"` (line 726) |
| 9 | Rate limiting UX | WARN | No specific rate limit message — generic "Erro de conexao" for all failures |
| 10 | Mobile | PASS | Responsive grid (grid-cols-1 md:grid-cols-3); search input full-width on mobile |

### Issues Found

- **[MEDIUM] No timeout handling**: The task description mentions a 120-second timeout, but the client-side code has NO AbortController or timeout mechanism. If the API hangs, the user sees the loading animation indefinitely with no way to cancel.

- **[MEDIUM] No abort on unmount**: Like AI Coach, there is no cleanup to abort the SSE stream if the user navigates away during analysis.

- **[LOW] Invalid ticker handling is weak**: `resolveTicker()` falls back to `clean.toUpperCase()` for unknown input (line 200). If a user types "asdfgh", it sends "ASDFGH" to the API. The error handling depends entirely on the server returning a useful error.

- **[LOW] Confirm dialog for delete uses `window.confirm`** (line 619): Inconsistent with the rest of the app which uses shadcn Dialog components.

- **[LOW] SSE parse errors silently swallowed** (line 712): `catch {}` with no logging.

- **[INFO] History cards delete button**: Delete button uses opacity-0 on hover — not accessible on touch devices where hover does not exist. Users on mobile cannot delete analyses.

---

## Page 3: Macro Intelligence — `/app/macro`
**File:** `app/app/macro/page.tsx` (612 lines)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Loading state | PASS | Skeleton pulse cards while loading (lines 451-463) |
| 2 | Empty state | PASS | Individual components handle empty data (InterestRatesPanel line 39, HeadlinesFeed line 157, WeeklyBriefing line 134) |
| 3 | Error state | WARN | `fetchData` catches errors with console.error only (line 105) — no user-facing error message |
| 4 | Auth gated | PASS | Parent layout AuthGate |
| 5 | Dark mode | PASS | Semantic tokens throughout |
| 6 | bg-card bug | FAIL | 4 instances of bare `bg-card` without inline style (lines 557, 573, 589, 602). Also 3 in MacroWidgetBriefing.tsx. |
| 7 | Performance | PASS | All 6 fetches run in parallel via Promise.allSettled (line 47) — excellent |
| 8 | Tier gating | PASS | InterestRatesPanel and WeeklyHistory wrapped in PaywallGate requiredPlan="pro" |
| 9 | Rate limiting UX | WARN | Refresh cooldown uses `alert()` (line 137) — jarring UX, should use toast or inline message |
| 10 | Mobile | PASS | Responsive grid (grid-cols-1 xl:grid-cols-12); tabs stack vertically |

### Issues Found

- **[HIGH] bg-card bug — 4 instances** (lines 557, 573, 589, 602): Four `<section>` elements use `bg-card` class without the required inline `style={{ backgroundColor: "hsl(var(--card))" }}`. Per CLAUDE.md this is CRITICAL and will render transparent backgrounds.

- **[MEDIUM] No user-facing error state**: If all 6 API calls fail, the page shows loading skeleton then renders empty sections with no explanation. The `catch` at line 105 only logs to console. Users see a blank page with no retry option.

- **[MEDIUM] alert() calls** (lines 137, 230, 254, 275): Multiple uses of `window.alert()` for error messages and confirmation. Inconsistent with the premium UI; should use shadcn toast or Dialog.

- **[MEDIUM] MacroWidgetBriefing.tsx bg-card bug**: 3 additional instances of bare `bg-card` without inline style (lines 23, 33, 45 of that file).

- **[LOW] RegionalAnalysis uses emoji flags** (line 18 of RegionalAnalysis.tsx): `REGION_EMOJI` uses Unicode globe emojis which render poorly on Windows (the project already uses flagcdn elsewhere to work around this — see EconomicCalendar.tsx line 36).

- **[LOW] Calendar polling every 5 min during market hours** (line 443): The `handleCalendarRefresh` fires every 5 minutes and hits the API endpoint. This could cause rate limiting issues on Vercel Hobby plan.

- **[LOW] Silent auto-regenerate** (line 347-391): `silentRegenerate` makes a POST to regenerate-report with a 55s timeout. If it fails, only console.warn is shown. User gets stale data with no indication.

---

## Component Audit Summary

| Component | bg-card bug | Dark mode | Empty state | Mobile |
|-----------|------------|-----------|-------------|--------|
| ChatInput.tsx | PASS (no bg-card) | PASS | N/A | PASS |
| ChatMessage.tsx | WARN (bg-card/60 line 44) | PASS | N/A | PASS |
| QuickActionCard.tsx | PASS (inline style) | PASS | N/A | PASS |
| UsageBar.tsx | PASS (inline style) | PASS | N/A | PASS |
| EconomicCalendar.tsx | PASS (no bg-card) | PASS | PASS | WARN (values hidden <sm) |
| InterestRatesPanel.tsx | PASS (inline style) | PASS | PASS | PASS |
| HeadlinesFeed.tsx | PASS (inline style) | PASS | PASS | PASS |
| WeeklyBriefing.tsx | PASS (inline style) | PASS | PASS | PASS |
| SentimentBar.tsx | PASS (no bg-card) | PASS | PASS | PASS |
| AssetImpactCards.tsx | PASS (inline style) | PASS | PASS | PASS |
| DecisionIntelligence.tsx | PASS (inline style) | PASS | PASS | PASS |
| RegionalAnalysis.tsx | PASS (inline style) | WARN (emoji) | PASS | PASS |
| AdaptiveAlerts.tsx | PASS (no bg-card) | PASS | PASS | PASS |
| MacroWidgetBriefing.tsx | FAIL (3 instances) | PASS | PASS | PASS |

---

## Consolidated Issues by Severity

### HIGH (3)
1. **bg-card transparency bug in macro page** — 4 bare `bg-card` without inline style in `app/app/macro/page.tsx` lines 557, 573, 589, 602
2. **bg-card transparency bug in MacroWidgetBriefing** — 3 bare `bg-card` in `components/macro/MacroWidgetBriefing.tsx` lines 23, 33, 45
3. **router.replace() in AI Coach** — lines 150, 163 of `app/app/ai-coach/page.tsx` violate CLAUDE.md auth rules

### MEDIUM (6)
4. **No user-facing error state on macro page** — all fetch failures silent to user
5. **alert() usage in macro page** — 4 instances of window.alert() instead of toast/Dialog
6. **bg-card/60 opacity risk in AI Coach** — 6 instances without inline style fallback
7. **No timeout/abort in Analyst** — SSE stream can hang indefinitely
8. **No abort-on-unmount in AI Coach** — streaming leak on navigation
9. **No specific rate limit message in Analyst** — generic error for all failures

### LOW (7)
10. Missing conversation delete in AI Coach
11. No mobile conversation switcher in AI Coach
12. Silent SSE parse errors (AI Coach line 460, Analyst line 712)
13. Weak ticker validation in Analyst
14. window.confirm() in Analyst delete flow
15. Emoji flags in RegionalAnalysis (Windows rendering)
16. Touch-inaccessible delete button in Analyst history

---

## Technical Debt Estimate
- HIGH fixes: ~3 hours
- MEDIUM fixes: ~4 hours
- LOW fixes: ~3 hours
- **Total: ~10 hours**
