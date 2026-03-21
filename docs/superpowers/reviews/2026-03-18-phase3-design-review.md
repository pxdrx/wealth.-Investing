# Phase 3 Design Spec Review

> **Reviewer:** Code Reviewer Agent
> **Date:** 2026-03-18
> **Spec:** `docs/superpowers/specs/2026-03-18-phase3-high-impact-features-design.md`
> **Verdict:** Approve with required changes (5 Critical, 4 Important, 6 Suggestions)

---

## What Was Done Well

- **Phased implementation order** is well thought out -- foundation first, then features that depend on each other (Reports before Psychology Analytics, Psychology before AI Q&A context injection).
- **Graceful degradation** for MFE/MAE (10-trade minimum, empty states) is a mature design choice.
- **Widget toggle instead of full drag-and-drop** is a pragmatic YAGNI-respecting decision that avoids `react-grid-layout` complexity.
- **Reuse of existing patterns** -- extending AI Coach rather than creating a new page, using Recharts, Context API.
- **Tier gating** is consistently applied across all features.
- **Client-side computation** for Reports avoids new API routes for the analytics engine.

---

## Critical Issues (Must Fix)

### C1. ValuesVisibilityContext duplicates existing PrivacyContext

The spec proposes a new `ValuesVisibilityContext` with `useValuesVisibility()` hook and `<MoneyDisplay>` component. However, `components/context/PrivacyContext.tsx` already exists with identical semantics (`hidden`, `toggle`, `mask`). It is already consumed by `AccountsOverview`, `CalendarPnl`, `CalendarGrid`, `DayDetailPanel`, `JournalBriefing`, and the dashboard page.

**Fix:** The spec should reference `PrivacyContext` and extend it (add localStorage persistence, add `<MoneyDisplay>` as a convenience wrapper around `usePrivacy().hidden`). Do NOT create a duplicate context.

### C2. PrivacyContext lacks localStorage persistence

The existing `PrivacyContext` initializes `hidden` to `false` with no localStorage persistence. The spec correctly identifies the need for `localStorage('wealth-hide-values')` but frames it as a new context. This is a bug in the existing code that the spec should fix in-place.

**Fix:** Add `useState(() => localStorage.getItem('wealth-hide-values') === 'true')` init + `useEffect` sync to the existing `PrivacyProvider`.

### C3. JournalTradeRow type needs extension, not just DB columns

The spec lists SQL `ALTER TABLE` statements for new columns but does not mention updating the `JournalTradeRow` interface in `components/journal/types.ts`. Every query that fetches trades will need to SELECT these new columns, and the TypeScript interface must match.

**Fix:** Add to the spec: update `JournalTradeRow` interface with all 9 new fields (emotion, discipline, setup_quality, custom_tags, entry_rating, exit_rating, management_rating, mfe_usd, mae_usd). Also update any `.select("*")` calls or explicit column lists in journal queries.

### C4. ai-stats.ts already computes overlapping metrics

`lib/ai-stats.ts` already calculates `winRate`, `profitFactor`, `avgRR`, `bySymbol`, `bySession`, `byDay`, `streaks`, `weeklyPnl` via `PersonalTradeStats`. The spec proposes a new `lib/trade-analytics.ts` that would recompute many of the same metrics.

**Fix:** The spec should either (a) extend `ai-stats.ts` into a general-purpose analytics module, or (b) extract shared computation into `lib/trade-analytics.ts` and refactor `ai-stats.ts` to consume it. Do not maintain two parallel metric calculation codebases.

### C5. macro_events table has no write policy or ingestion strategy

The spec defines `macro_events` with a SELECT-only RLS policy ("Anyone can read"). But there is no INSERT policy and no clear answer for who writes data: a cron job? An API route? A service-role client? Without a write path, this table will always be empty.

**Fix:** Specify the ingestion mechanism. Options: (a) server-side cron via Vercel Cron + service-role INSERT, (b) on-demand fetch in the API route with upsert. Add corresponding RLS INSERT policy (service_role only) or use `.rpc()`.

---

## Important Issues (Should Fix)

### I1. Sharpe/Sortino/Calmar require daily returns -- data may be sparse

The spec computes Sharpe as `mean_daily_return / stddev * sqrt(252)`. For prop traders who trade 2-3 days per week, daily return series will be sparse and noisy. Zero-PnL days (no trades) must be handled: are they zero-return days or excluded? This significantly affects the ratio.

**Fix:** Document the handling of non-trading days. Recommendation: include them as zero-return days for risk metrics (standard practice). Add a minimum-data guard (e.g., require 20+ trading days before showing Sharpe/Sortino).

### I2. Tiltmeter formula has a scale mismatch

The formula averages `emotion_score` (-1/0/+1), `discipline_score` (-1/+1, no zero), and `sub_ratings_score` (average of three -1/0/+1 values). But discipline has no neutral (0) option, so it is asymmetrically weighted toward extremes compared to emotion (which has "Neutro" = 0).

**Fix:** Either add a neutral discipline option ("Sem observacao" = 0), or weight the components differently to account for discipline's binary nature.

### I3. Custom tags column (TEXT[]) has no size/count limit

`custom_tags TEXT[]` allows unlimited tags of unlimited length per trade. A malicious or careless user could store megabytes in this field.

**Fix:** Add a CHECK constraint: `CHECK (array_length(custom_tags, 1) <= 20 AND octet_length(array_to_string(custom_tags, '')) <= 2000)` or validate in the application layer.

### I4. Dashboard layout in profiles table -- migration risk

Adding `dashboard_layout JSONB` to the `profiles` table couples UI preferences to the user identity table. If the JSONB schema evolves, old rows become stale. There is no versioning mechanism.

**Fix:** Add a `version` field inside the JSONB: `{ version: 1, widgets: [...] }`. The client should migrate/default when it encounters an old version or null.

---

## Suggestions (Nice to Have)

### S1. Period selector should include "Custom Range" UI spec

The Reports page mentions "Custom Range" as a period option but provides no detail on the date picker UI. Recommend specifying: use shadcn `<Calendar>` in a popover with two date inputs.

### S2. Consider `useMemo` guidance for heavy analytics

`lib/trade-analytics.ts` will compute 17+ metrics on potentially thousands of trades. The spec should note that the Reports page must `useMemo` the analytics computation, keyed on `[trades, period, accountId]`, to avoid recomputing on every render.

### S3. Macro event correlation -- clarify time alignment

"Correlate trader's daily PnL with macro events in the same week" is vague. Specify: does "same week" mean the calendar week (Mon-Sun) containing the event? Or a 7-day window centered on the event? Different definitions yield different insights.

### S4. Exit Efficiency edge case: MFE = 0

The formula `pnl / mfe` for exit efficiency will produce `NaN` or `Infinity` when MFE is 0 (trade went immediately against the trader). The spec should define this case: either exclude from the average or treat as 0% efficiency.

### S5. MoneyDisplay should support different currencies

The spec shows `<MoneyDisplay value={123.45} />` but the app uses both USD and BRL. The component should accept a `currency` prop with a default.

### S6. Missing nav entry for Reports page

The spec does not mention adding `/app/reports` to the app navigation (sidebar/navbar). This should be listed in the implementation plan.

---

## Schema Review Summary

| Change | Verdict | Notes |
|--------|---------|-------|
| 7 columns on journal_trades (psychology) | OK | TEXT for enums is fine given pt-BR labels; consider CHECK constraints |
| 2 columns on journal_trades (MFE/MAE) | OK | NUMERIC is correct for currency values |
| 1 column on profiles (dashboard_layout) | OK with fix | Add JSONB version field (I4) |
| macro_events table | Needs fix | Missing write path (C5) |
| RLS on macro_events | Incomplete | SELECT-only, no INSERT policy |

---

## YAGNI Assessment

| Item | Verdict |
|------|---------|
| 17+ metrics in Reports | Justified -- competitive parity with TradesViz/Edgewonk |
| Macro event correlation | Borderline -- high effort, unclear data source reliability. Consider deferring to Phase 4 |
| VIX integration (mentioned in insight examples) | YAGNI -- no VIX data source is defined; remove from examples |
| OHLC API for MFE/MAE (Phase 4+) | Correctly deferred |
| Full drag-and-drop grid | Correctly avoided |

---

## Files Referenced

- `components/context/PrivacyContext.tsx` -- existing value-hide context (C1, C2)
- `components/journal/types.ts` -- JournalTradeRow interface needs update (C3)
- `lib/ai-stats.ts` -- existing analytics overlap (C4)
- `lib/ai-prompts.ts` -- will be extended for Feature B
- `components/dashboard/AccountsOverview.tsx` -- already uses PrivacyContext
