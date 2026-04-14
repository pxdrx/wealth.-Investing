# Forensic Error Handling & Edge Case Audit

**Date:** 2026-03-28
**Auditor:** Claude Opus 4.6 (Code Quality Analyzer)
**Scope:** 11 core lib files + codebase-wide grep patterns

---

## Summary

- **Overall Robustness Score:** 6.5/10
- **Files Analyzed:** 11 primary + ~30 via grep
- **Critical Issues:** 4
- **High Issues:** 8
- **Medium Issues:** 10
- **Low Issues:** 6
- **Technical Debt Estimate:** ~18 hours

---

## 1. ERROR SWALLOWING

### [CRITICAL] F01 — Narrative generator JSON.parse without recovery
- **File:** `lib/macro/narrative-generator.ts:86-108`
- **Code:** `const parsed: NarrativeOutput = JSON.parse(jsonStr);` (lines 86 and 108)
- **Impact:** If Claude returns malformed JSON (happens regularly with LLMs), the entire narrative generation crashes with an unhandled exception. The "JSON repair" logic on lines 92-105 is fragile: it counts braces but does not handle truncated string literals, which will still throw on `JSON.parse`. The `end_turn` path (line 86) has zero error handling.
- **Fix:** Wrap both `JSON.parse` calls in try/catch. Return a structured fallback with `weekly_bias: "Erro ao gerar narrativa"` and empty `asset_impacts` instead of crashing. Consider a JSON repair library like `jsonrepair`.
- **Effort:** small

### [CRITICAL] F02 — Unguarded req.json() in billing checkout
- **File:** `app/api/billing/checkout/route.ts:16`
- **Code:** `const body = await req.json();`
- **Impact:** If a client sends a malformed JSON body, this throws an unhandled exception inside the outer try/catch. While the outer catch returns 500, the error message logged will be a generic parse error, not a useful "invalid body" 400 response. More critically, `body.plan` and `body.interval` are accessed without validation — a missing `plan` field leads to `PRICE_IDS[undefined]` which returns `undefined`, correctly caught by the `if (!priceId)` check. However, a body like `{ plan: "__proto__" }` could cause unexpected behavior.
- **Fix:** Add `req.json().catch(() => null)` with explicit 400 response for null body. Validate `planInterval` against a whitelist before indexing `PRICE_IDS`.
- **Effort:** small

### [CRITICAL] F03 — Unguarded req.json() in AI conversations PATCH
- **File:** `app/api/ai/conversations/route.ts:55`
- **Code:** `const body = await req.json();`
- **Impact:** Malformed JSON body crashes the PATCH handler with no try/catch wrapper. Unlike the POST handler (line 31) which uses `.catch(() => ({}))`, the PATCH and DELETE handlers have no protection. An attacker or buggy client sending invalid JSON gets a raw 500 error.
- **Fix:** Add `.catch(() => null)` and return 400 for null body.
- **Effort:** small

### [HIGH] F04 — Analyst agent double JSON.parse without fallback
- **File:** `lib/analyst/agent/analyst.ts:349-356`
- **Code:** First `JSON.parse(cleaned)` fails, then tries regex extraction + second `JSON.parse(jsonMatch[0])`. If both fail, throws a generic "Failed to parse analysis response".
- **Impact:** The outer `generateAnalysis` function has no try/catch — the caller (API route) must handle this. If the API route also doesn't catch, the user sees a raw error. Additionally, the regex `\{[\s\S]*\}` is greedy and may match nested braces incorrectly.
- **Fix:** The API route at `app/api/analyst/run/route.ts` should be verified to catch this. Add a non-greedy JSON extraction or use `jsonrepair`.
- **Effort:** small

### [HIGH] F05 — generateAdaptiveUpdate has no JSON error handling
- **File:** `lib/macro/narrative-generator.ts:151`
- **Code:** `return JSON.parse(jsonStr);`
- **Impact:** If Claude returns malformed JSON in the adaptive update, this crashes with no recovery. Called from cron job context where unhandled errors may silently fail.
- **Fix:** Wrap in try/catch, return a fallback object `{ update_text: "Erro ao processar", alert_title: "Erro" }`.
- **Effort:** small

### [MEDIUM] F06 — Empty catch blocks in localStorage operations
- **Files:** `components/context/PrivacyContext.tsx:27,33`, `app/app/settings/page.tsx:97,106,230`, `app/app/page.tsx:209,214`
- **Impact:** Silent failure when localStorage is full or unavailable (incognito mode, Safari private). User preferences silently lost. Not critical but degrades UX.
- **Fix:** Acceptable for localStorage reads. For writes (line 230), consider showing a toast warning.
- **Effort:** low priority

### [MEDIUM] F07 — Catch-and-swallow in gatherData parallel promises
- **File:** `lib/analyst/agent/analyst.ts:113,120,125,131,139,154`
- **Code:** Multiple `.catch(() => {})` swallowing errors from data sources.
- **Impact:** If ALL data sources fail silently, `gatherData` returns an empty result object. The validation on lines 255-263 catches the "all null" case for non-index assets, but for indices (`isKnownIndex === true`), a completely empty dataset is passed to Claude, producing hallucinated analysis.
- **Fix:** Track failed source count. If >80% of sources fail, throw an error even for indices.
- **Effort:** small

---

## 2. FINANCIAL CALCULATION RISKS

### [CRITICAL] F08 — Drawdown percentage uses equity-from-zero baseline
- **File:** `lib/trade-analytics.ts:248-254`
- **Code:**
  ```typescript
  let peak = 0;
  // ...
  const dd = peak > 0 ? ((pt.equity - peak) / peak) * 100 : 0;
  ```
- **Impact:** The equity curve starts at 0 (cumulative P&L), so `peak` starts at 0 and stays 0 until the first profitable day. If the first trades are losses, `peak` remains 0 and drawdown is always calculated as 0% — **masking real drawdowns**. For a prop trader with a $100k account who loses $5k on day 1, the drawdown shows 0% instead of 5%. This is the most dangerous bug in the codebase for a trading dashboard.
- **Fix:** The equity curve should start from the account's `starting_balance_usd`. Pass starting balance as a parameter to `computeTradeAnalytics` and initialize `cumulative = startingBalance`. Calculate drawdown as `((equity - peak) / peak) * 100`.
- **Effort:** medium

### [HIGH] F09 — Calmar Ratio uses absolute P&L instead of annualized return
- **File:** `lib/trade-analytics.ts:273-274`
- **Code:** `const calmarRatio = tradingDays >= 20 && maxDrawdown > 0 ? (netPnl / maxDrawdown) : null;`
- **Impact:** Calmar Ratio should be annualized return / max drawdown. This uses raw net P&L / max drawdown (which is a percentage). The units are inconsistent: dollars / percentage = meaningless number. A trader with $50k profit and 10% drawdown gets Calmar = 5000, which is nonsensical.
- **Fix:** Calculate annualized return percentage, then divide by max drawdown percentage: `(annualizedReturnPct / maxDrawdownPct)`.
- **Effort:** small

### [HIGH] F10 — Recovery Factor has same unit mismatch
- **File:** `lib/trade-analytics.ts:285`
- **Code:** `const recoveryFactor = maxDrawdown > 0 ? netPnl / maxDrawdown : 0;`
- **Impact:** Same issue as F09 — `netPnl` is in USD, `maxDrawdown` is a percentage. Recovery Factor should be net profit / max drawdown in the same units.
- **Fix:** Use absolute dollar drawdown or convert both to percentages.
- **Effort:** small

### [HIGH] F11 — Sharpe/Sortino ratios ignore risk-free rate
- **File:** `lib/trade-analytics.ts:257-268`
- **Code:** `(meanDaily / dailyStdDev) * Math.sqrt(252)` — no risk-free rate subtraction.
- **Impact:** With current interest rates around 3.6% (FED), ignoring the risk-free rate overestimates Sharpe by a meaningful amount. For a strategy returning 10% annually, Sharpe is overstated by ~35%.
- **Fix:** Subtract daily risk-free rate from `meanDaily` before dividing. Use `POLICY_RATES.FED.current_rate / 252` as daily risk-free rate.
- **Effort:** small

### [HIGH] F12 — cTrader parser parseFloat without NaN guard
- **File:** `lib/ctrader-parser.ts:102-112`
- **Code:**
  ```typescript
  const profit = parseFloat(cols[colMap.profit] || "0");
  const commission = colMap.commission >= 0 ? parseFloat(cols[colMap.commission] || "0") : 0;
  ```
- **Impact:** `parseFloat("abc")` returns `NaN`. If the CSV has non-numeric data in profit/commission columns (e.g., "N/A", "-", or locale-formatted numbers like "1.234,56"), the trade gets `NaN` for P&L, which propagates through all analytics calculations. Unlike the MT5 parsers which have `parseNumber` with NaN guards, cTrader uses raw `parseFloat`.
- **Fix:** Replace all `parseFloat(cols[...] || "0")` with a safe `parseNum` function that returns 0 for NaN, similar to the one in `mt5-html-parser.ts`.
- **Effort:** small

### [MEDIUM] F13 — MT5 XLSX parser: comma replacement bug
- **File:** `lib/mt5-parser.ts:40`
- **Code:** `const n = parseFloat(v.replace(/[\s,]/g, "").replace(",", "."));`
- **Impact:** The first `.replace(/[\s,]/g, "")` removes ALL commas. The second `.replace(",", ".")` is therefore a no-op — it will never find a comma to replace. For European locale numbers like "1.234,56", the first replace strips the comma producing "1.23456", then parseFloat gives 1.23456 instead of 1234.56. This silently corrupts P&L values by 1000x for large numbers.
- **Fix:** Replace comma-to-dot FIRST, then strip spaces: `v.replace(/\s/g, "").replace(",", ".").replace(/\.(?=.*\.)/g, "")` to handle "1.234.56" -> "1234.56".
- **Effort:** small

### [MEDIUM] F14 — toFixed display without proper rounding
- **File:** Multiple components (JournalKpiCards, JournalTradesTable, etc.)
- **Code:** `kpis.pnlTotal.toFixed(2)` used for display.
- **Impact:** JavaScript's `toFixed` uses banker's rounding in some engines. For a P&L of $-0.005, `toFixed(2)` may show "0.00" or "-0.01" depending on the engine. Not a data corruption issue but can confuse users on edge values.
- **Fix:** Use `Intl.NumberFormat` for consistent formatting. Low priority.
- **Effort:** small

---

## 3. NULL SAFETY

### [HIGH] F15 — toLocalDateStr crashes on invalid dates
- **File:** `lib/trade-analytics.ts:162-168`
- **Code:**
  ```typescript
  const parts = new Intl.DateTimeFormat("en-CA", {...}).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  ```
- **Impact:** The non-null assertions (`!`) will throw if `Intl.DateTimeFormat` doesn't return expected parts. This happens when `isoDate` is empty string or invalid — `new Date("")` produces an Invalid Date, and `formatToParts` on Invalid Date throws `RangeError: Invalid time value`. Since `closed_at` comes from user-imported data, invalid dates are a real possibility.
- **Fix:** Add a guard: `if (isNaN(d.getTime())) return "unknown";` at the top of the function.
- **Effort:** small

### [HIGH] F16 — Stripe PRICE_IDS uses non-null assertion on env vars
- **File:** `lib/stripe.ts:20-24`
- **Code:**
  ```typescript
  export const PRICE_IDS = {
    pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    // ...
  };
  ```
- **Impact:** The `!` assertions mean these are `string` type at compile time, but `undefined` at runtime if env vars are missing. The warning on lines 27-32 only logs — it doesn't prevent usage. `planFromPriceId` and `intervalFromPriceId` compare against `undefined`, which will never match any input, so ALL plans return `null`. The checkout route's `PRICE_IDS[planInterval]` returns `undefined`, caught by `if (!priceId)` — but the Stripe webhook's `planFromPriceId` will fail to identify any subscription, potentially leaving users on free tier after paying.
- **Fix:** Type `PRICE_IDS` values as `string | undefined`. Add runtime validation in `planFromPriceId` to throw if PRICE_IDS are all undefined.
- **Effort:** small

### [MEDIUM] F17 — ensureDefaultAccounts returns ok:true even on partial failure
- **File:** `lib/bootstrap/ensureDefaultAccounts.ts:40-44`
- **Code:** `if (insertAcc) { console.warn(...); continue; }` then returns `{ ok: true }`.
- **Impact:** If inserting the default "Pessoal" account fails (e.g., RLS policy blocks it, or unique constraint), the function returns `ok: true` even though the account was NOT created. The user enters the app with no accounts, causing downstream failures.
- **Fix:** Track failures and return `{ ok: false }` if any insert failed.
- **Effort:** small

### [MEDIUM] F18 — faireconomy.ts raw[0] access without length check
- **File:** `lib/macro/faireconomy.ts:52`
- **Code:** `const firstEventDate = parseDate(raw[0].date).date;`
- **Impact:** The `raw.length > 0` check is present on line 51, so this is actually guarded. However, if the API returns `[null]` or `[{}]`, accessing `.date` on an object without that property produces `undefined`, and `parseDate(undefined)` would crash. The `parseDate` function handles this via `new Date(undefined)` producing Invalid Date, caught by `catch`.
- **Fix:** Low risk due to existing guards, but add `raw[0]?.date` for defense-in-depth.
- **Effort:** small

---

## 4. TIMEZONE ISSUES

### [HIGH] F19 — MT5 HTML parser uses wrong UTC offset
- **File:** `lib/mt5-html-parser.ts:36`
- **Code:** `const MT5_TO_UTC_MS = -5 * 60 * 60 * 1000;`
- **Comment says:** "MT5 report times are UTC+2 (broker server). Convert to UTC then store. Offset: -5h"
- **Impact:** Converting from UTC+2 to UTC requires subtracting 2 hours (`-2 * 60 * 60 * 1000`), not 5. A -5h offset converts to UTC-3 (Brasilia time), not UTC. This means ALL imported MT5 HTML trades have timestamps 3 hours earlier than they should be. A trade closed at 14:00 UTC shows as 09:00 UTC. This corrupts session analysis (Tokyo/London/NY), day-of-week breakdowns, and P&L calendar.
- **However:** MT5 brokers commonly use UTC+2 in winter and UTC+3 in summer (EET/EEST). The comment says "Offset: -5h" which would convert UTC+3 to UTC-2, still wrong. There may be broker-specific logic here that was calibrated empirically for a specific broker (possibly The5ers or FTMO using UTC+3 server time, converting to Brasilia UTC-3, hence -5h to go from UTC+2 to UTC-3... but that would mean times are stored in local Brasilia time, not UTC).
- **Fix:** Clarify the intended target timezone. If the goal is UTC, use `-2 * 60 * 60 * 1000`. If the goal is Brasilia time, document this clearly and ensure `trade-analytics.ts` applies the correct timezone offset. Add a configurable broker timezone offset.
- **Effort:** medium (requires verifying existing data)

### [MEDIUM] F20 — MT5 XLSX parser has NO timezone handling
- **File:** `lib/mt5-parser.ts:46-57`
- **Code:** `parseDate` uses `new Date(d.y, d.m - 1, d.d, ...)` which creates dates in LOCAL timezone.
- **Impact:** The XLSX parser creates dates in the server's local timezone (Vercel's timezone, typically UTC). There is no broker timezone offset applied, unlike the HTML parser. This means XLSX and HTML imports produce different timestamps for the same trade, causing duplicate detection to fail and analytics inconsistencies.
- **Fix:** Apply the same UTC offset as the HTML parser for consistency.
- **Effort:** small

### [MEDIUM] F21 — cTrader parser stores raw date strings
- **File:** `lib/ctrader-parser.ts:115-116`
- **Code:** `const openedAt = cols[colMap.openTime] || ""; const closedAt = cols[colMap.closeTime] || "";`
- **Impact:** cTrader dates are stored as-is from the CSV with no parsing or timezone normalization. If the CSV uses local timezone strings (e.g., "2026-03-28 14:30:00"), they're stored verbatim. The `trade-analytics.ts` then interprets them via `new Date()` which parses them in the browser's local timezone. This creates timezone-dependent analytics.
- **Fix:** Parse dates with explicit timezone handling. cTrader exports typically use the server timezone — document and normalize.
- **Effort:** medium

---

## 5. JSON PARSING

### [HIGH] F22 — Billing checkout req.json() inside outer try/catch
- **File:** `app/api/billing/checkout/route.ts:16`
- **Impact:** Covered in F02. The outer catch returns 500 instead of 400 for malformed bodies.
- **Fix:** See F02.

### [MEDIUM] F23 — AI conversations DELETE handler
- **File:** `app/api/ai/conversations/route.ts:68+`
- **Impact:** Likely has same unguarded `req.json()` pattern as PATCH. Need to verify.
- **Fix:** Add `.catch(() => null)` guard.
- **Effort:** small

---

## 6. RACE CONDITIONS

### [HIGH] F24 — ensureDefaultAccounts called in background with no dedup lock
- **File:** `lib/bootstrap/ensureDefaultAccounts.ts`
- **Impact:** If a user opens two browser tabs simultaneously on first login, `ensureDefaultAccounts` runs twice in parallel. Both check for existing accounts (finding none), then both try to insert. If there's no unique constraint on `(user_id, name)`, duplicate accounts are created. The code comment says "Idempotent: nao duplica" but idempotency only works if the insert has a unique constraint or if checks happen atomically.
- **Fix:** Add a unique constraint on `accounts(user_id, name)` in Supabase, or use `upsert` instead of `insert`.
- **Effort:** small (DB migration)

### [MEDIUM] F25 — Stripe webhook + checkout race
- **File:** `app/api/billing/checkout/route.ts:29-43`
- **Impact:** The checkout creates a Stripe customer and the webhook processes the subscription. If the webhook fires before the checkout response returns (race condition), the webhook may try to find a subscription row that doesn't exist yet. The checkout inserts the subscription row AFTER creating the Stripe session, but the Stripe webhook for `checkout.session.completed` may fire before the client even redirects.
- **Fix:** The webhook should use `upsert` for the subscriptions table, creating the row if it doesn't exist. Verify the webhook handler does this.
- **Effort:** medium

### [MEDIUM] F26 — Narrative generator no concurrency guard
- **File:** `lib/macro/narrative-generator.ts`
- **Impact:** If the cron job and a manual "regenerate" request run simultaneously, two Claude API calls fire, both read the same stale events, and both try to write to the same DB row. Last-write-wins, potentially overwriting a more complete analysis with a less complete one.
- **Fix:** Use a DB-level advisory lock or a `processing` flag in the macro_reports table.
- **Effort:** medium

---

## 7. ADDITIONAL FINDINGS

### [MEDIUM] F27 — Anthropic API key exposed in error messages
- **File:** `lib/macro/narrative-generator.ts:8`
- **Code:** `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
- **Impact:** If the API key is missing, the Anthropic SDK throws an error that may include the configuration object in the stack trace. Server-side only, but could leak to error monitoring (Sentry).
- **Fix:** Validate `process.env.ANTHROPIC_API_KEY` before constructing the client, throw a sanitized error.
- **Effort:** small

### [LOW] F28 — Hardcoded central bank rates are 5 days stale
- **File:** `lib/macro/rates-fetcher.ts:14`
- **Code:** `Last updated: 2026-03-23` — today is 2026-03-28.
- **Impact:** If both Apify and DB fail, users see rates from 5 days ago. BANXICO's `next_meeting` is `2026-03-26` which has already passed — displaying "next meeting: March 26" on March 28 looks broken.
- **Fix:** Update hardcoded rates. Add a `stale_since` field to the UI when using fallback data.
- **Effort:** small

### [LOW] F29 — Analyst data context truncated at 30k chars
- **File:** `lib/analyst/agent/analyst.ts:269`
- **Code:** `JSON.stringify(data, null, 2).slice(0, 30000)`
- **Impact:** If the gathered data exceeds 30k characters, important fields (like options data or macro data, which are added last in the JSON) are silently truncated. Claude receives incomplete data and may hallucinate the missing parts.
- **Fix:** Prioritize which fields to include. Truncate individual fields rather than the whole JSON.
- **Effort:** medium

### [LOW] F30 — MT5 HTML parser MAX_ROWS only guards positions, not transactions
- **File:** `lib/mt5-html-parser.ts:262,314`
- **Impact:** The 5000 row limit applies to the positions loop but NOT the transactions loop. A malicious HTML file with millions of transaction rows could cause memory exhaustion.
- **Fix:** Add the same MAX_ROWS check to the transactions loop.
- **Effort:** small

### [LOW] F31 — PRICE_IDS compared with strict equality against undefined
- **File:** `lib/stripe.ts:36-38`
- **Code:** `if (priceId === PRICE_IDS.pro_monthly || ...)` where PRICE_IDS values may be `undefined`.
- **Impact:** `"some_stripe_id" === undefined` is always `false`, so if env vars are missing, `planFromPriceId` always returns `null`. After a successful Stripe payment, the webhook can't determine the plan, potentially leaving the user on free tier.
- **Fix:** See F16.

### [LOW] F32 — subscription.ts uses .single() in POST handler
- **File:** `app/api/ai/conversations/route.ts:41`
- **Code:** `.single()` in the insert+select query.
- **Impact:** If the insert fails silently (RLS), `.single()` throws PGRST116. The CLAUDE.md explicitly warns against `.single()` for queries that may return null. However, since this is an insert (not a lookup), `.single()` is technically correct here — the insert should always return exactly one row if it succeeds, and the `if (error)` check on line 43 handles failures.
- **Fix:** Low risk, but consider `.maybeSingle()` for consistency with project conventions.
- **Effort:** small

---

## Priority Fix Order

| Priority | IDs | Effort | Impact |
|----------|-----|--------|--------|
| P0 (now) | F08, F19 | medium | Financial data corruption — drawdown + timestamps wrong |
| P1 (this week) | F01, F02, F03, F05, F12, F13, F15, F16 | small each | Crashes + money display bugs |
| P2 (next sprint) | F04, F09, F10, F11, F17, F24, F25 | small-medium | Incorrect metrics + race conditions |
| P3 (backlog) | F06, F07, F14, F18, F20, F21, F23, F26-F32 | varies | Edge cases + polish |

---

## Positive Findings

1. **MT5 parsers have NaN guards** — `parseNumber` and `parseNum` functions properly return 0 for NaN, unlike the cTrader parser.
2. **Supabase queries consistently check `.error`** — all API routes follow the `if (error)` pattern.
3. **Auth flows are well-guarded** — Bearer token extraction, `getUser()` validation, proper 401 responses.
4. **Trade analytics gracefully handles empty arrays** — division-by-zero is guarded in `winRate`, `avgWin`, `avgLoss`, `expectancy`, `tradesPerWeek`.
5. **XLSX parser handles missing sheets** — early return for missing `sheetName` or `sheet`.
6. **API routes use proper error responses** — consistent `{ ok: boolean, error?: string }` pattern.
7. **Kelly Criterion is half-Kelly with 0.5 cap** — responsible risk management.
