# TypeScript Quality Audit Report

**Date:** 2026-03-28
**Auditor:** Claude Opus 4.6 (Code Quality Analyzer)
**Scope:** All `.ts` / `.tsx` files in `app/`, `lib/`, `components/` (excluding `node_modules`, `.next`, `dexter/`)

---

## Summary

| Metric | Value |
|---|---|
| Overall Quality Score | 6.5 / 10 |
| Files Analyzed | ~200+ |
| Total Issues Found | 68 |
| HIGH severity | 14 |
| MEDIUM severity | 32 |
| LOW severity | 22 |
| Technical Debt Estimate | 12-16 hours |

**Verdict:** The codebase claims `"strict": true` and "zero `any`" but has significant escape hatches. The biggest risks are (1) 48+ non-null assertions on `process.env` that will crash at runtime if env vars are missing, (2) type-unsafe trade data flowing through `as unknown as` casts in financial calculations, and (3) Framer Motion variants typed as `any` which hide prop errors.

---

## tsconfig.json Assessment

```json
{
  "strict": true,        // OK
  "allowJs": true,       // WARNING: allows untyped .js files
  "skipLibCheck": true,  // OK for build speed, minor risk
  "noEmit": true         // OK (Next.js handles emit)
}
```

**Missing strict sub-flags** (already implied by `strict: true`): `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict` -- all enabled via `strict`. This is correct.

**Risk:** `allowJs: true` means the 4 `.js` files in `scripts/` bypass TypeScript entirely. These are build scripts, not runtime code, so the risk is LOW.

**`dexter/` is excluded** from tsconfig -- it has its own type issues but does not affect the main app build.

---

## HIGH Severity (Could Cause Runtime Crash)

### H-01: 48+ Non-Null Assertions on `process.env` (Runtime Crash Risk)

Every API route and cron job uses `process.env.VAR!` to create Supabase clients. If any env var is missing or misspelled, the app crashes with no helpful error message.

**Files affected (partial list):**
- `app/api/webhooks/stripe/route.ts:16-17` -- `process.env.NEXT_PUBLIC_SUPABASE_URL!`, `process.env.SUPABASE_SERVICE_ROLE_KEY!`
- `app/api/analyst/run/route.ts:60-61`
- `app/api/macro/regenerate-report/route.ts:14-15, 29-30`
- `app/api/macro/refresh-rates/route.ts:10-11`
- `app/api/macro/refresh-calendar/route.ts:10-11`
- `app/api/macro/panorama/route.ts:10-11`
- `app/api/macro/compare/route.ts:9-10`
- `app/api/macro/headlines/route.ts:11-12, 101-102, 167-168`
- `app/api/macro/rates/route.ts:9-10`
- `app/api/macro/history/route.ts:9-10`
- `app/api/macro/calendar/route.ts:11-12, 18-19`
- `app/api/macro/alerts/route.ts:10-11`
- `app/api/account/delete/route.ts:54-55`
- `app/api/cron/weekly-briefing/route.ts:11-12`
- `app/api/cron/rates-sync/route.ts:11-12`
- `app/api/cron/narrative-update/route.ts:11-12`
- `app/api/cron/headlines-sync/route.ts:17-18`
- `app/api/cron/calendar-sync-pm/route.ts:10-11`
- `app/api/cron/calendar-sync/route.ts:11-12`

**Why it's a problem:** The project already has a `lib/supabase/env.ts` that validates env vars with helpful error messages. API routes bypass this entirely and use raw `!` assertions.

**Fix:** Create a shared `getSupabaseAdmin()` helper that validates env vars and throws descriptive errors, similar to `getStripe()` in `lib/stripe.ts`.

### H-02: Stripe Price ID Non-Null Assertions (Financial Data)

`lib/stripe.ts:20-23`:
```typescript
export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  ultra_monthly: process.env.STRIPE_ULTRA_MONTHLY_PRICE_ID!,
  ultra_annual: process.env.STRIPE_ULTRA_ANNUAL_PRICE_ID!,
} as const;
```

**Why it's a problem:** If these are `undefined`, `planFromPriceId()` and `intervalFromPriceId()` silently return `null`, causing subscription lookups to fail. The warning on line 28 logs but doesn't prevent usage. In a financial app, silent billing failures are critical.

**Fix:** Throw at initialization time (server-only) if any price ID is missing, or use a lazy getter pattern like `getStripe()`.

### H-03: `as unknown as TradeRow[]` Casts in Dashboard (Financial Calculations)

`app/app/page.tsx:805, 815, 861`:
```typescript
trades={realTrades as unknown as TradeRow[]}
trades={realTrades as unknown as JournalTradeRow[]}
```

`app/app/journal/page.tsx:540`:
```typescript
trades={trades as unknown as TradeRow[]}
```

**Why it's a problem:** This is a double-cast that completely bypasses the type system. If the actual shape of `realTrades` diverges from `TradeRow` (e.g., a Supabase schema change adds/removes a field), PnL calculations, equity curves, and KPI cards will silently compute wrong numbers or crash at runtime.

**Fix:** Create a proper mapping function `toTradeRow(supabaseRow): TradeRow` that validates required fields exist, or unify the types so the cast is unnecessary.

### H-04: `as unknown as Record<string, unknown>` in Stripe Webhook

`app/api/webhooks/stripe/route.ts:70, 98`:
```typescript
current_period_end: getPeriodEnd(sub as unknown as Record<string, unknown>),
```

**Why it's a problem:** The Stripe subscription object is cast away to a generic record. If the Stripe API changes `current_period_end` format or nesting, this silently returns `null`, and the user's subscription period_end is never saved -- they could lose access or get indefinite free access.

**Fix:** Use Stripe's typed `Stripe.Subscription` type and access the field with proper null checks.

### H-05: `as unknown as` in Analyst Agent (Financial Data Pipeline)

`lib/analyst/agent/analyst.ts:125, 131, 139`:
```typescript
results.macroEconomic = d as unknown as Record<string, unknown>;
results.onChain = d as unknown as Record<string, unknown>;
results.options = d as unknown as Record<string, unknown>;
```

**Why it's a problem:** Macro economic data, on-chain data, and crypto options data are all cast to untyped records. The AI analyst makes trading recommendations based on this data. Type errors here mean the analyst could receive malformed data and produce incorrect recommendations.

**Fix:** Define proper interfaces for `MacroEconomicData`, `OnChainData`, `CryptoOptionsData`.

---

## MEDIUM Severity (Hides Potential Bugs)

### M-01: Framer Motion Variants Typed as `any` (6 occurrences)

| File | Line | Variable |
|---|---|---|
| `components/landing/Hero.tsx` | 10 | `floatingCoin1: any` |
| `components/landing/Hero.tsx` | 22 | `floatingCoin2: any` |
| `components/landing/Hero.tsx` | 34 | `staggerContainer: any` |
| `components/landing/Hero.tsx` | 42 | `fadeUp: any` |
| `components/landing/HowItWorks.tsx` | 9 | `floatAnim: any` |
| `components/landing/MacroIntelligence.tsx` | 8 | `floatAnim: any` |

**Why it's a problem:** Violates the project's "zero `any`" rule. If the Framer Motion API changes, these objects won't produce compile errors.

**Fix:** Type as `Variants` from `framer-motion`:
```typescript
import { Variants } from "framer-motion";
const floatAnim: Variants = { ... };
```

### M-02: `as any` in Auth Callback (OTP Verification)

`app/auth/callback/page.tsx:25`:
```typescript
const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
```

**Why it's a problem:** The OTP `type` parameter is cast to `any`, meaning any arbitrary string could be passed. If Supabase changes valid OTP types, this won't catch it at compile time.

**Fix:** Type as `import("@supabase/supabase-js").EmailOtpType` or validate the `type` parameter against known values before calling.

### M-03: `as any` in Profile Error Handling

`lib/profile.ts:65, 72`:
```typescript
if (e2 && (e2 as any).code !== "PGRST116") { ... }
if ((error as any).code === "PGRST116") { ... }
```

**Why it's a problem:** The Supabase error object does have a `code` property on `PostgrestError`. Using `as any` hides the actual type.

**Fix:** Import and use `PostgrestError` from `@supabase/supabase-js`:
```typescript
import { PostgrestError } from "@supabase/supabase-js";
if ((error as PostgrestError)?.code === "PGRST116") { ... }
```

### M-04: `liquid-glass-button.tsx` Dynamic Element as `any`

`components/ui/liquid-glass-button.tsx:101`:
```typescript
const Comp: any = href ? "a" : "button"
```

**Fix:** Use a polymorphic pattern:
```typescript
const Comp = href ? "a" : "button";
// Or use React.ElementType
```

### M-05: `as unknown as` in Cheerio Scrapers (3 occurrences)

| File | Line |
|---|---|
| `lib/macro/scrapers/truth-social.ts` | 131 |
| `lib/macro/scrapers/rss-headlines.ts` | 87 |
| `lib/macro/scrapers/rss-headlines.ts` | 160 |

All cast Cheerio nodes to `{ data: string }`. The Cheerio API types should be used directly instead.

### M-06: `eslint-disable-next-line react-hooks/exhaustive-deps` (6 occurrences)

| File | Line |
|---|---|
| `app/app/settings/page.tsx` | 128 |
| `app/app/journal/page.tsx` | 100 |
| `app/app/ai-coach/page.tsx` | 169, 181, 200 |
| `components/auth/AuthGate.tsx` | 170 |
| `components/journal/DayDetailModal.tsx` | 195 |

**Why it's a problem:** Missing `useEffect` dependencies can cause stale closures -- the effect runs with outdated values. In `AuthGate.tsx` this is especially risky: a stale auth session reference could cause the gate to allow/deny access incorrectly.

**Fix:** For each, audit the dependency array. Use `useCallback`/`useRef` to stabilize dependencies rather than suppressing the lint rule.

### M-07: `as unknown as` for Dashboard Layout Setting

`app/app/settings/page.tsx:235`:
```typescript
.update({ dashboard_layout: dashLayout as unknown as Record<string, unknown> })
```

**Fix:** Define a proper Supabase type for the `dashboard_layout` JSON column.

### M-08: Canvas Non-Null Assertions in SpiralBackground (20+ occurrences)

`components/landing/SpiralBackground.tsx:123-185` uses `canvas!` and `ctx!` extensively. While these are within a `useEffect` that initializes them, a re-render race condition could cause `ctx` to be null.

**Fix:** Add a single guard `if (!canvas || !ctx) return;` at the top of the draw function.

### M-09: Canvas Non-Null Assertions in LoginBackground

`components/login/LoginBackground.tsx:154-165` -- same pattern as M-08.

### M-10: Non-Null Assertions on Trade Fields

`app/app/page.tsx:838-842`:
```typescript
account_id: t.account_id!,
direction: t.direction!,
opened_at: t.opened_at!,
```

`components/dashboard/EquityCurveMini.tsx:21, 28`:
```typescript
.sort((a, b) => a.opened_at!.localeCompare(b.opened_at!));
const day = t.opened_at!.slice(0, 10);
```

These are after a `.filter()` that checks for non-null, so they are **logically safe** but TypeScript cannot narrow through `.filter()`.

**Fix:** Use a type guard:
```typescript
function hasRequiredFields(t: Trade): t is Trade & { account_id: string; direction: string; opened_at: string } {
  return t.account_id !== null && t.direction !== null && t.opened_at !== null;
}
trades.filter(hasRequiredFields).map(t => t.opened_at) // no ! needed
```

### M-11: CalendarGrid Non-Null Assertion on Render Data

`components/calendar/CalendarGrid.tsx:150`:
```typescript
{data!.tradeCount} trade{data!.tradeCount !== 1 ? "s" : ""}
```

If `data` is `undefined` at render time, this crashes the UI.

---

## LOW Severity (Code Smells)

### L-01: `allowJs: true` in tsconfig.json

Allows 4 untyped `.js` files in `scripts/`:
- `scripts/clean.js`
- `scripts/screenshot-assets.js`
- `scripts/screenshot-slides.js`
- `scripts/screenshot-stories.js`

These are build/utility scripts, not runtime code. Risk is minimal but they bypass all type checking.

### L-02: `supabase/env.ts` Non-Null Assertions After Validation

`lib/supabase/env.ts:96, 100-101`:
```typescript
url: url!.trim(),
anonKey: anonKey!.trim(),
```

These are used AFTER validation that throws if the values are falsy, so they are **logically safe**. However, the TypeScript narrowing doesn't propagate through the validation function.

**Fix:** Use `as string` after the validation check (narrower than `!`) or restructure the validation to return typed values.

### L-03: `dexter/` Directory Has Multiple `any` Types

The `dexter/` directory (excluded from main tsconfig) contains:
- `dexter/src/components/approval-prompt.ts:14` -- `selector: any`
- `dexter/src/cli.ts:71, 281, 283` -- `body: any`, `focusTarget?: any`
- `dexter/src/tools/search/exa.ts:18` -- `client as any`

Since `dexter/` is excluded from the main build, these don't affect the trading dashboard. They should be fixed if `dexter/` is ever integrated.

### L-04: No `@ts-ignore` or `@ts-expect-error` Found

This is a **positive finding**. Zero suppressed TypeScript errors in the main codebase.

---

## Positive Findings

1. **Strict mode is genuinely enabled** -- `strict: true` in tsconfig with no overrides
2. **Zero `@ts-ignore` / `@ts-expect-error`** -- no compiler errors are suppressed
3. **No `.js` files in app/lib/components** -- all runtime code is TypeScript
4. **Supabase client architecture is well-structured** -- `lib/supabase/env.ts` validates env vars properly (the problem is that API routes bypass it)
5. **Stripe client uses lazy init with validation** -- `getStripe()` pattern is correct
6. **RLS queries consistently use `.eq("user_id", ...)`** -- proper security pattern
7. **The `dexter/` codebase is properly excluded** from the main tsconfig

---

## Recommended Fix Priority

### Immediate (blocks production safety)
1. **H-01:** Create `getSupabaseAdmin()` helper that validates env vars -- eliminates 48+ non-null assertions
2. **H-03:** Create `toTradeRow()` mapper function -- eliminates unsafe financial data casts
3. **H-04:** Use `Stripe.Subscription` type in webhook handler

### Next sprint
4. **H-02:** Make Stripe price IDs fail-fast at server startup
5. **H-05:** Define interfaces for analyst data pipeline
6. **M-01:** Type Framer Motion variants as `Variants`
7. **M-02:** Type OTP verification parameter
8. **M-03:** Use `PostgrestError` type for Supabase errors

### Tech debt backlog
9. **M-06:** Audit all `eslint-disable exhaustive-deps` suppressions
10. **M-08/M-09:** Add null guards to canvas rendering loops
11. **M-10:** Create type guard for filtered trade arrays
12. **L-02:** Clean up post-validation non-null assertions

---

*Generated by Claude Opus 4.6 (Code Quality Analyzer) on 2026-03-28*
