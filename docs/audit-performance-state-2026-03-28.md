# Performance & State Management Forensic Audit

**Date:** 2026-03-28
**Auditor:** Claude Opus 4.6
**Scope:** Memory leaks, re-renders, data fetching, bundle size

---

## Summary

- **Overall Quality Score:** 7/10
- **Files Analyzed:** 12 core + 46 with useEffect
- **Critical Issues:** 3
- **High Issues:** 6
- **Medium Issues:** 8
- **Technical Debt Estimate:** ~16 hours

---

## CRITICAL Issues

### [CRITICAL] C-01: PrivacyContext creates new object every render (no useMemo)

- **File:** `components/context/PrivacyContext.tsx:44`
- **Code:**
  ```tsx
  <PrivacyContext.Provider value={{ hidden, toggle, mask }}>
  ```
- **Impact:** Every PrivacyProvider render creates a new `{ hidden, toggle, mask }` object reference. This triggers re-renders in ALL 28 consumers of usePrivacy (MoneyDisplay, KPI cards, calendar, equity chart, etc.) even when nothing changed. On the dashboard page alone, this cascades through ~15 components.
- **Fix:** Wrap value in `useMemo`:
  ```tsx
  const value = useMemo(() => ({ hidden, toggle, mask }), [hidden, toggle, mask]);
  ```
- **Effort:** Small (5 min)

### [CRITICAL] C-02: Dashboard page re-fetches ALL data on every tab focus/visibility change

- **File:** `app/app/page.tsx:158-176`
- **Code:**
  ```tsx
  function handleVisibility() {
    if (document.visibilityState === "visible" && initialLoadDone.current) {
      setRefreshKey((k) => k + 1);  // triggers full re-fetch
    }
  }
  function handleFocus() {
    if (initialLoadDone.current) {
      setRefreshKey((k) => k + 1);  // ALSO triggers full re-fetch
    }
  }
  ```
- **Impact:** Switching between browser tabs fires both `visibilitychange` AND `focus` events, causing TWO full data re-fetches (journal_trades, accounts, prop_accounts, prop_payouts, day_notes). On a dashboard with hundreds of trades, this creates noticeable lag and unnecessary Supabase queries. The `refreshKey` change also triggers the `getSession()` call again (line 178-221), which is wasteful.
- **Fix:** (1) Remove the `focus` listener entirely -- `visibilitychange` is sufficient. (2) Add a cooldown (e.g., 30 seconds) to debounce rapid re-fetches. (3) Consider SWR/React Query for stale-while-revalidate instead of manual refreshKey.
- **Effort:** Medium (1 hour)

### [CRITICAL] C-03: SpiralBackground runs requestAnimationFrame unconditionally (1500 stars per frame)

- **File:** `components/landing/SpiralBackground.tsx:109-195`
- **Code:**
  ```tsx
  useEffect(() => {
    // ...
    const stars = Array.from({ length: N_STARS }, () => new Star(rng));
    // ...
    function render(ts: number) {
      if (!isVisible) { raf = requestAnimationFrame(render); return; }
      // renders 1500 stars + 80 trail dots per frame
    }
    raf = requestAnimationFrame(render);
  }, []);  // Empty deps — never re-creates, but theme read via dataset
  ```
- **Impact:** Even when "not visible" (IntersectionObserver), the rAF loop continues running (line 154: re-schedules itself). This consumes CPU on every frame (~16ms) even when the canvas is scrolled off-screen. On mobile devices, this drains battery. The 1500 stars + 80 trail elements per frame is also heavy for low-end devices.
- **Fix:** (1) When `!isVisible`, do NOT re-schedule rAF -- instead, re-observe and restart on intersection. (2) Add `matchMedia("(prefers-reduced-motion: reduce)")` check to disable entirely. (3) Consider reducing N_STARS to 800 with no visual difference.
- **Effort:** Medium (1-2 hours)

---

## HIGH Issues

### [HIGH] H-01: Journal page fetches day_notes without AbortController

- **File:** `app/app/journal/page.tsx:123-136`
- **Code:**
  ```tsx
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: notesData } = await supabase
        .from("day_notes")
        .select("date, observation, tags")
        .eq("user_id", userId);
      // ... sets state
    })();
  }, [userId]);
  ```
- **Impact:** If userId changes rapidly (e.g., during auth flow), stale responses can overwrite fresh state. No cancellation mechanism exists. Same pattern at line 138-156 for prop_accounts fetch.
- **Fix:** Add `cancelled` flag pattern (like the trades fetch already does) or use AbortController.
- **Effort:** Small (15 min)

### [HIGH] H-02: Dashboard page has 14 useState hooks -- god component

- **File:** `app/app/page.tsx:124-148`
- **Impact:** The DashboardPage function manages 14 separate state variables (userId, sessionChecked, journalTrades, journalLoading, accountsById, dayNotes, propAccounts, propPayoutsTotal, news, newsLoading, newsError, dashboardLayout, refreshKey, iframeVisible). Any state change re-runs the entire component function, re-evaluating all useMemo hooks and re-rendering. This is a classic "god component" smell.
- **Fix:** Extract into custom hooks: `useDashboardData()`, `useNewsData()`, `usePropData()`. Each hook manages its own state, reducing coupling.
- **Effort:** Large (3-4 hours)

### [HIGH] H-03: Macro page fires 6 parallel fetches on mount, then re-fetches on calendarWeek change

- **File:** `app/app/macro/page.tsx:47-54`
- **Code:**
  ```tsx
  const [calRes, panRes, ratesRes, alertsRes, histRes, hdlRes] = await Promise.allSettled([
    fetch(`/api/macro/calendar?week=${calendarWeek}`),
    fetch(`/api/macro/panorama?week=${defaultWeek}`),
    fetch("/api/macro/rates"),
    fetch(`/api/macro/alerts?week=${defaultWeek}`),
    fetch("/api/macro/history"),
    fetch("/api/macro/headlines?limit=15"),
  ]);
  ```
- **Impact:** `fetchData` depends on `calendarWeek` (line 111). When user navigates weeks, ALL 6 fetches fire again, but only the calendar data changes. The panorama, rates, alerts, history, and headlines are all independent of `calendarWeek`. This wastes ~5 unnecessary network requests per week navigation.
- **Fix:** Split `fetchData` into `fetchCalendar(week)` and `fetchStaticData()`. Only re-fetch calendar on week change.
- **Effort:** Medium (1 hour)

### [HIGH] H-04: Macro page has duplicate panorama JSON parsing logic

- **File:** `app/app/macro/page.tsx:74-88` and `app/app/macro/page.tsx:289-303`
- **Impact:** The exact same 5-field JSON.parse block is copy-pasted in `fetchData` and `handleRegenerate`. A third partial copy exists in `silentRegenerate` (line 383). This is a maintenance hazard -- if the schema changes, 3 places need updating.
- **Fix:** Extract to a `parsePanorama(pan)` utility function.
- **Effort:** Small (15 min)

### [HIGH] H-05: Multiple simultaneous auth state listeners across providers

- **Files:**
  - `components/auth/AuthGate.tsx:156` -- `onAuthStateChange`
  - `components/context/ActiveAccountContext.tsx:110` -- `onAuthStateChange`
  - `components/context/SubscriptionContext.tsx:48` -- `onAuthStateChange`
- **Impact:** Three independent `onAuthStateChange` listeners fire on every auth event. Each one calls `getSession()` independently on SIGNED_IN, resulting in 3+ parallel session fetches. The Supabase client deduplicates internally, but the redundant React state updates still cascade.
- **Fix:** Create a single `AuthEventProvider` that broadcasts auth state, consumed by ActiveAccount and Subscription providers. Eliminates duplicate listeners and redundant getSession calls.
- **Effort:** Large (3-4 hours)

### [HIGH] H-06: Macro page calendar poll runs every 5 minutes during market hours without user awareness

- **File:** `app/app/macro/page.tsx:431-448`
- **Code:**
  ```tsx
  pollRef.current = setInterval(() => {
    const now = new Date();
    // ...
    if (day >= 1 && day <= 5 && hour >= 12 && hour <= 22) {
      handleCalendarRefresh();  // fires POST + GET
    }
  }, 5 * 60 * 1000);
  ```
- **Impact:** Combined with the 30-min headline poll (line 412-427), subscription 15-min poll, and AuthGate 5-min check, the macro page generates ~20 background requests per hour even when the user is idle on the tab. No visibility check exists -- these run even when the tab is hidden.
- **Fix:** Add `document.visibilityState === "visible"` guard inside interval callbacks. Pause all polls when tab is hidden.
- **Effort:** Small (30 min)

---

## MEDIUM Issues

### [MEDIUM] M-01: TradingView iframes loaded eagerly in ticker tape

- **File:** `app/app/page.tsx:602-611`
- **Impact:** The ticker tape iframe loads immediately on dashboard mount regardless of viewport position. Each TradingView iframe is ~300KB of JS. The advanced chart uses IntersectionObserver (good), but the ticker does not.
- **Fix:** Wrap ticker in the same IntersectionObserver pattern used for the chart.
- **Effort:** Small (15 min)

### [MEDIUM] M-02: Journal page loads ALL trades without pagination

- **File:** `app/app/journal/page.tsx:108-112`
- **Code:**
  ```tsx
  const { data, error: err } = await supabase
    .from("journal_trades")
    .select("id, symbol, direction, ...")
    .eq("account_id", activeAccountId)
    .order("opened_at", { ascending: true });  // ALL trades
  ```
- **Impact:** For active traders with 500+ trades, this fetches the entire history on every page load. Combined with the CalendarPnl, KPI cards, and equity chart all processing the full array, initial render is heavy.
- **Fix:** Add server-side pagination (`.range(0, 100)`) with "load more" for the trades table. Calendar and KPIs can still use aggregated data.
- **Effort:** Large (4+ hours)

### [MEDIUM] M-03: Dashboard fetches day_notes sequentially after accounts

- **File:** `app/app/page.tsx:282-292`
- **Impact:** The `day_notes` query runs after journal_trades + accounts + prop_accounts + prop_payouts all complete. It could run in parallel with the prop data fetches.
- **Fix:** Include day_notes in the second `Promise.all` alongside prop_accounts and prop_payouts.
- **Effort:** Small (10 min)

### [MEDIUM] M-04: `import * as cheerio` in parsers not tree-shakeable

- **Files:**
  - `lib/mt5-html-parser.ts:1` -- `import * as cheerio from "cheerio"`
  - `lib/macro/te-scraper.ts:2` -- `import * as cheerio from "cheerio"`
  - `lib/macro/scrapers/ff-calendar.ts:5` -- `import * as cheerio from "cheerio"`
- **Impact:** Namespace imports prevent tree-shaking. Cheerio is ~80KB minified. These are server-only files (API routes), so client bundle is not affected, but serverless function cold starts are slower.
- **Fix:** Use `import { load } from "cheerio"` for named imports.
- **Effort:** Small (5 min)

### [MEDIUM] M-05: 19 pages use "use client" -- several could be server components

- **Files:** `app/manifesto/page.tsx`, `app/changelog/page.tsx`, `app/blog/page.tsx`, `app/academy/page.tsx`
- **Impact:** Static content pages that could be server components are shipped as client components, increasing JS bundle. Each "use client" page pulls in React runtime + hydration code.
- **Fix:** Audit each page -- if it only renders static content with no hooks/events, remove "use client".
- **Effort:** Medium (1-2 hours)

### [MEDIUM] M-06: CalendarPnl onNoteSaved creates new closure every render

- **File:** `app/app/journal/page.tsx:544-546`
- **Code:**
  ```tsx
  onNoteSaved={(date, note) => {
    setDayNotes((prev) => ({ ...prev, [date]: note }));
  }}
  ```
- **Impact:** Inline arrow function creates a new reference on every render, causing CalendarPnl to re-render unnecessarily (if it uses React.memo).
- **Fix:** Extract to a useCallback:
  ```tsx
  const handleNoteSaved = useCallback((date: string, note: DayNote) => {
    setDayNotes((prev) => ({ ...prev, [date]: note }));
  }, []);
  ```
- **Effort:** Small (5 min)

### [MEDIUM] M-07: AuthGate sequential getUser + getSession calls

- **File:** `components/auth/AuthGate.tsx:95-106`
- **Code:**
  ```tsx
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  // ...
  const { data: { session } } = await supabase.auth.getSession();
  ```
- **Impact:** Two sequential Supabase auth calls on every AuthGate check. `getUser()` already validates the token server-side; `getSession()` is a local lookup. While `getSession()` is fast, this pattern adds latency to the critical auth path.
- **Fix:** Use `getUser()` for validation, then read expiry from the response headers or use a single `getSession()` with `getUser()` as fallback only when session seems expired.
- **Effort:** Small (30 min)

### [MEDIUM] M-08: Framer Motion imported eagerly in journal page

- **File:** `app/app/journal/page.tsx:5`
- **Code:**
  ```tsx
  import { AnimatePresence, motion } from "framer-motion";
  ```
- **Impact:** Framer Motion is ~30KB gzipped. The journal page uses it only for tab transitions and import panel animation. Unlike the dashboard page which uses `dynamic()` imports, the journal imports it eagerly.
- **Fix:** Use `dynamic()` for the AnimatePresence wrapper, or use CSS transitions for simple opacity/translate animations.
- **Effort:** Medium (1 hour)

---

## Positive Findings

1. **ActiveAccountContext is well-memoized** -- uses `useMemo` for value, `useCallback` for setters, proper cleanup on auth listener. Gold standard for this codebase.
2. **SubscriptionContext has proper cleanup** -- auth listener unsubscribed, interval cleared, mounted flag used.
3. **Dashboard uses dynamic imports extensively** -- 10 heavy components are code-split with loading skeletons. This is excellent practice.
4. **SpiralBackground uses IntersectionObserver** -- pauses rendering when off-screen (though the rAF loop still runs -- see C-03).
5. **Import flow uses AbortController** -- both preview (30s) and import (180s) have proper timeout handling.
6. **Macro page uses Promise.allSettled** -- gracefully handles partial failures in the 6-fetch pattern.
7. **AuthGate has inactivity timeout** -- 8-hour timeout with throttled activity tracking is well-implemented.

---

## Priority Matrix

| # | Severity | Effort | Impact | Priority |
|---|----------|--------|--------|----------|
| C-01 | Critical | Small | High (28 consumers) | P0 -- fix immediately |
| C-02 | Critical | Medium | High (double fetches) | P0 |
| C-03 | Critical | Medium | High (battery drain) | P1 |
| H-01 | High | Small | Medium (race condition) | P1 |
| H-03 | High | Medium | Medium (5 wasted reqs) | P1 |
| H-06 | High | Small | Medium (hidden tab waste) | P1 |
| H-04 | High | Small | Low (maintenance) | P2 |
| M-03 | Medium | Small | Low (sequential fetch) | P2 |
| M-04 | Medium | Small | Low (server cold start) | P2 |
| M-06 | Medium | Small | Low (re-render) | P2 |
| H-02 | High | Large | Medium (god component) | P3 |
| H-05 | High | Large | Medium (3 listeners) | P3 |
| M-02 | Medium | Large | Medium (large dataset) | P3 |
| M-05 | Medium | Medium | Low (bundle size) | P3 |
| M-07 | Medium | Small | Low (auth latency) | P3 |
| M-08 | Medium | Medium | Low (bundle size) | P3 |
| M-01 | Medium | Small | Low (ticker iframe) | P3 |
