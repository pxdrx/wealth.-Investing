# Forensic Responsiveness Audit Report

**Date:** 2026-03-28
**Scope:** All pages and key components in wealth.Investing trading dashboard
**Files Analyzed:** 25+ pages and components
**Issues Found:** 22
**Overall Mobile Readiness Score:** 5/10
**Technical Debt Estimate:** 16-24 hours

---

## CRITICAL: No Mobile Navigation for Authenticated Area

### [HIGH] R-001: Sidebar completely hidden on mobile -- no alternative navigation

- **File:** `components/layout/AppSidebar.tsx:~line with className`
- **Code:** `className="... hidden md:flex"` on the `<aside>` element
- **Issue:** The sidebar uses `hidden md:flex`, meaning it is completely invisible below 768px. There is NO mobile drawer, hamburger menu, or bottom tab bar for the authenticated `/app/**` routes. Users on phones cannot navigate between Dashboard, Journal, Macro, AI Coach, Settings, or any other page. This is the single most critical responsiveness bug.
- **Fix:** Implement a mobile navigation solution. Options (pick one):
  1. **Bottom tab bar** (recommended for trading apps) -- fixed at bottom with 5 key nav items
  2. **Slide-in drawer** triggered by a hamburger icon in a sticky top bar
  3. **Sheet component** (shadcn `<Sheet>`) as a slide-over sidebar
- **Effort:** large (8-12 hours for bottom tab bar with animations)

---

## Layout Issues

### [HIGH] R-002: Calendar grid-cols-7 is tiny on mobile

- **File:** `components/calendar/CalendarGrid.tsx:92,105`
- **Code:** `<div className="grid grid-cols-7">` (no responsive override)
- **Issue:** 7 equal columns on a 375px screen = ~53px per cell. Day numbers and PnL values are crammed into extremely small cells. With borders and padding, usable touch area per day is well under 44px. On narrower devices (320px), content will overlap.
- **Fix:** On mobile, switch to a weekly view or a scrollable list view. Alternatively, allow horizontal scroll with `overflow-x-auto` and set `min-w-[500px]` on the grid.
- **Effort:** medium (4-6 hours for a proper weekly mobile view)

### [HIGH] R-003: Journal trades table lacks horizontal scroll on mobile

- **File:** `components/journal/JournalTradesTable.tsx:172`
- **Code:** `<div className="rounded-input border border-border/40 shadow-sm overflow-hidden">` followed by `<Table>`
- **Issue:** The table has 8+ columns (Symbol, Direction, Open, Close, Duration, PnL, Fees, Net PnL, Result, Tags). While some columns use `hidden lg:table-cell`, at least 5 columns remain visible on mobile. The wrapper has `overflow-hidden` instead of `overflow-x-auto`, meaning columns may get cut off or text will compress illegibly.
- **Fix:** Change `overflow-hidden` to `overflow-x-auto` on the table wrapper. Add `min-w-[600px]` to the `<Table>` to ensure it scrolls rather than compresses.
- **Effort:** small (30 min)

### [MEDIUM] R-004: Dashboard grid-cols-3 divide-x does not collapse

- **File:** `app/app/page.tsx:1155`
- **Code:** `<div className="grid grid-cols-3 divide-x">`
- **Issue:** This 3-column grid has no responsive breakpoint. On mobile, content in each third is squeezed to ~105px width. If containing numerical data with labels, it will overflow or truncate.
- **Fix:** Add `grid-cols-1 sm:grid-cols-3` and replace `divide-x` with conditional dividers.
- **Effort:** small (30 min)

### [MEDIUM] R-005: Dashboard KPI grid-cols-2 md:grid-cols-4 is acceptable but tight

- **File:** `app/app/page.tsx:507`
- **Code:** `<div className="grid grid-cols-2 gap-4 md:grid-cols-4">`
- **Issue:** 2 columns on mobile is reasonable, but with `gap-4` (16px) and `px-6` page padding, each card is ~155px wide on a 375px screen. If KPI values are long (e.g., "$1,234,567.89"), text may overflow.
- **Fix:** Add `text-sm` or `text-xs` for values on mobile, or use `truncate` on long numbers.
- **Effort:** small (15 min)

### [MEDIUM] R-006: Login page grid-cols-2 feature grid on mobile

- **File:** `app/login/page.tsx:169`
- **Code:** `<div className="mt-16 grid grid-cols-2 gap-8">`
- **Issue:** No responsive fallback. On narrow screens, 2-column grid with `gap-8` (32px) leaves very little room per item (~140px per column on 375px screen minus padding).
- **Fix:** Change to `grid-cols-1 sm:grid-cols-2`.
- **Effort:** small (5 min)

### [MEDIUM] R-007: Macro page xl:col-span grid only breaks at xl (1280px)

- **File:** `app/app/macro/page.tsx:555`
- **Code:** `<div className="grid grid-cols-1 gap-6 xl:grid-cols-12">`
- **Issue:** The grid only goes to 12-col at `xl` (1280px), and falls back to `grid-cols-1` below that. This is actually well-handled. However, the child sections `xl:col-span-8` and `xl:col-span-4` have no intermediate breakpoint, so tablet users (768-1279px) see a single stacked column with full-width cards. Consider adding an `lg:grid-cols-12` with `lg:col-span-7` / `lg:col-span-5`.
- **Fix:** Add `lg:grid-cols-12 lg:col-span-8 lg:col-span-4` breakpoints.
- **Effort:** small (15 min)

### [LOW] R-008: Onboarding grid-cols-2 for account type selection

- **File:** `app/onboarding/page.tsx:355`
- **Code:** `<div className="grid grid-cols-2 gap-3 mb-6">`
- **Issue:** 2 columns is generally fine for 4 selectable cards on mobile, but the container is already constrained to `max-w-[400px]`. Should be OK but verify text does not wrap awkwardly.
- **Fix:** No immediate fix needed; test with longer Portuguese text.
- **Effort:** small (verify only)

---

## Table & Data Issues

### [MEDIUM] R-009: AccountsOverview table has overflow-x-auto (GOOD) but no min-width

- **File:** `components/dashboard/AccountsOverview.tsx:221-222`
- **Code:** `<div className="overflow-x-auto"><table className="w-full text-sm">`
- **Issue:** The table scrolls horizontally (good), but `w-full` means it will compress columns rather than scroll. Without `min-w-[600px]` or similar, columns squeeze together first.
- **Fix:** Add `min-w-[640px]` to the `<table>` element.
- **Effort:** small (10 min)

### [MEDIUM] R-010: JournalBriefing grid-cols-2 insight cards

- **File:** `components/dashboard/JournalBriefing.tsx:191`
- **Code:** `<div className="grid grid-cols-2 gap-x-6 gap-y-2.5">`
- **Issue:** No single-column fallback for very narrow screens. With `gap-x-6` (24px), each column gets ~152px on a 375px screen minus padding. Content may truncate.
- **Fix:** Change to `grid-cols-1 sm:grid-cols-2` and reduce `gap-x-6` to `gap-x-4` on mobile.
- **Effort:** small (10 min)

### [MEDIUM] R-011: BacktestSection grid-cols-3 md:grid-cols-6 stats

- **File:** `components/dashboard/BacktestSection.tsx:359`
- **Code:** `<div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 pt-2 pb-3">`
- **Issue:** 3 columns on mobile is very tight for stat labels + values. Each column is ~105px on 375px. Labels like "Win Rate" or "Profit Factor" may truncate.
- **Fix:** Change to `grid-cols-2 sm:grid-cols-3 md:grid-cols-6`.
- **Effort:** small (10 min)

### [LOW] R-012: SessionHeatmap grid-cols-3 divide-x

- **File:** `components/dashboard/SessionHeatmap.tsx:80`
- **Code:** `<div className="grid grid-cols-3 divide-x">`
- **Issue:** Same pattern as R-004. 3 static columns with no collapse.
- **Fix:** Same as R-004.
- **Effort:** small (10 min)

---

## Touch Target Issues

### [HIGH] R-013: Settings page order arrows use p-1 (24x24px effective area)

- **File:** `app/app/settings/page.tsx:479,488`
- **Code:** `className="rounded p-1 text-muted-foreground ..."` on up/down arrow buttons
- **Issue:** `p-1` (4px) around a small icon results in a touch target well below the 44x44px minimum. The entire `w-16` (64px) container holds two buttons side by side with `gap-0.5`, making them nearly impossible to tap accurately on mobile.
- **Fix:** Increase to `p-2.5` or add `min-h-[44px] min-w-[44px]` to each button.
- **Effort:** small (10 min)

### [MEDIUM] R-014: Analyst page delete button on history cards uses p-1

- **File:** `app/app/analyst/page.tsx:854`
- **Code:** `className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-full p-1 ..."`
- **Issue:** The delete button is (a) only visible on hover (unusable on touch), and (b) has `p-1` making it too small. Mobile users cannot delete analysis history items.
- **Fix:** Make visible on mobile (remove `opacity-0 group-hover:opacity-100` on touch devices), increase to `p-2`.
- **Effort:** small (15 min)

### [MEDIUM] R-015: Sidebar toggle button is 24x24px (h-6 w-6)

- **File:** `components/layout/AppSidebar.tsx` (toggle button)
- **Code:** `className="... flex h-6 w-6 items-center justify-center rounded-full ..."`
- **Issue:** 24x24px is below the 44px minimum for touch targets. However, since the sidebar is hidden on mobile (R-001), this only affects tablet users who see the sidebar.
- **Fix:** Increase to `h-9 w-9` or `h-10 w-10`.
- **Effort:** small (5 min)

---

## Navigation Issues

### [HIGH] R-016: No way to access AI Coach, Macro, Analyst, Reports, or Prop pages on mobile

- **File:** All `/app/**` pages
- **Issue:** Direct consequence of R-001. Without sidebar navigation on mobile, the only way to reach these pages is by typing the URL manually. There are no deep links from the dashboard to all sub-pages.
- **Fix:** Resolving R-001 (mobile nav) fixes this entirely.
- **Effort:** (included in R-001)

### [MEDIUM] R-017: Landing page Navbar mobile menu works but has no "Dashboard" link when logged in

- **File:** `components/landing/Navbar.tsx` (mobile menu section)
- **Code:** The mobile menu renders landing page links. The "Dashboard" CTA button uses `hidden md:inline-flex`, hiding it on mobile.
- **Issue:** Logged-in users on mobile who visit the landing page see the hamburger menu but cannot easily navigate to their dashboard -- the Dashboard button is desktop-only.
- **Fix:** Add the Dashboard link to the mobile menu items when user is logged in.
- **Effort:** small (15 min)

---

## Charts & Visualizations

### [LOW] R-018: All Recharts charts use ResponsiveContainer correctly

- **Files:** `components/dashboard/EquityCurveMini.tsx`, `components/dashboard/JournalBriefing.tsx`, `components/journal/JournalEquityChart.tsx`, `components/reports/BreakdownCharts.tsx`
- **Issue:** All charts use `<ResponsiveContainer width="100%" height={...}>` which is correct. No issues found here.
- **Fix:** None needed.

---

## Text & Readability Issues

### [LOW] R-019: Extensive use of text-[10px] and text-[11px]

- **Files:** Multiple (23+ instances across analyst, journal, settings, blog, academy pages)
- **Issue:** 10-11px text is very small on mobile screens. While used mostly for labels and metadata, it can be hard to read on smaller devices, especially for older users.
- **Fix:** Consider bumping to `text-xs` (12px) minimum on mobile using responsive classes like `text-xs sm:text-[10px]`. However, this is a stylistic choice and not a blocking issue.
- **Effort:** medium (spread across many files)

### [LOW] R-020: CalendarPnl grid-cols-3 md:grid-cols-6 is OK

- **File:** `components/calendar/CalendarPnl.tsx:175`
- **Code:** `<div className="grid grid-cols-3 md:grid-cols-6 gap-2">`
- **Issue:** 3 columns on mobile is acceptable for PnL summary stats. Each column gets ~105px which is tight but workable for small numbers.
- **Fix:** Monitor for overflow with large PnL values; add `truncate` if needed.
- **Effort:** small (5 min)

---

## Positive Findings

1. **Landing page Navbar** has a proper mobile hamburger menu with smooth animation (`md:hidden` toggle).
2. **Recharts** all use `ResponsiveContainer` with `width="100%"` -- charts will resize correctly.
3. **Dashboard and Prop pages** use `grid-cols-1 lg:grid-cols-12` -- proper single-column fallback on mobile.
4. **Macro page** uses `grid-cols-1 xl:grid-cols-12` -- stacks on mobile.
5. **AppSidebar** auto-collapses below 1024px via `window.innerWidth` listener -- good for tablets.
6. **AccountsOverview table** has `overflow-x-auto` wrapper -- scrollable on mobile.
7. **Journal trades table** intelligently hides less important columns on mobile with `hidden lg:table-cell` and `hidden xl:table-cell`.
8. **AI Coach sidebar** uses `hidden lg:flex` -- properly hidden on smaller screens.
9. **PricingCards** uses `md:grid-cols-3` with implicit single-column fallback.
10. **AddAccountModal** grid patterns are inside modals constrained by `max-w`, keeping them safe.

---

## Priority Fix Order

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| P0 | R-001 + R-016: Mobile navigation for /app | Blocks all mobile usage | large |
| P1 | R-002: Calendar mobile view | Key feature unusable | medium |
| P1 | R-003: Journal table overflow-x-auto | Data cut off | small |
| P2 | R-013: Settings touch targets | Hard to use | small |
| P2 | R-004 + R-012: grid-cols-3 collapse | Squeezed content | small |
| P2 | R-017: Dashboard link in mobile menu | Navigation gap | small |
| P3 | R-006: Login grid-cols-2 | Minor layout | small |
| P3 | R-009: Table min-width | Data compression | small |
| P3 | R-014: Analyst delete button | Hover-only on touch | small |
| P3 | R-010, R-011: Grid refinements | Minor layout | small |
| P4 | R-019: Small text sizes | Readability | medium |
| P4 | R-007: Macro tablet breakpoint | Minor layout | small |

---

## Summary

The trading dashboard has **one critical blocking issue**: there is no mobile navigation for the authenticated area (`/app/**`). The sidebar is completely hidden below 768px with no alternative, making the app unusable on phones. This single issue (R-001) should be the immediate priority.

Beyond that, the codebase shows generally good responsive patterns -- grids collapse properly on most pages, charts use `ResponsiveContainer`, and the landing page has a proper mobile menu. The remaining issues are mostly refinements: adding `overflow-x-auto` to tables, collapsing a few static grid layouts, and increasing touch targets on small buttons.

For a trading app where users frequently check positions on their phones, implementing a bottom tab bar (Dashboard, Journal, Macro, AI Coach, More) would be the highest-impact improvement.
