# Forensic Security Audit: API Routes
**Date:** 2026-03-28
**Auditor:** Security Auditor Agent (Claude Opus 4.6)
**Scope:** All 27 API route files in `app/api/**/route.ts`
**Application:** wealth.Investing Trading Dashboard (Next.js 14, Supabase, Stripe)

---

## Executive Summary

**27 routes audited.** Found **6 CRITICAL**, **8 HIGH**, **7 MEDIUM**, and **4 LOW** severity issues.

The most urgent issues are:
1. **PUBLIC macro routes with service role key** -- 2 routes use `SUPABASE_SERVICE_ROLE_KEY` without any authentication
2. **`check-rate-update` is PUBLIC and triggers external scraping** -- DoS/cost amplification vector
3. **`analyst/run` leaks raw error strings** to SSE clients
4. **In-memory rate limiter** on AI Coach is useless on serverless
5. **`.single()` used in conversations POST** -- can crash on constraint errors
6. **Multiple cron error responses leak `error.message`** to callers

---

## Security Matrix

| # | Route | Methods | Auth | Rate Limit | Input Valid. | Error Sanitized | Service Role | Issues |
|---|-------|---------|------|-----------|-------------|-----------------|-------------|--------|
| 1 | `/api/account/delete` | DELETE | Bearer | None | Minimal | Yes | Yes (justified) | H1, M1 |
| 2 | `/api/ai/coach` | POST | Bearer | In-memory (broken) | Good | Yes | No | C1, M2 |
| 3 | `/api/ai/conversations` | GET/POST/PATCH/DELETE | Bearer | None | Minimal | **NO** | No | C2, H2, M3 |
| 4 | `/api/analyst/run` | POST | Bearer | None | Good (sanitized ticker) | **NO** | Yes (justified) | C3, H3 |
| 5 | `/api/analyst/history` | GET/DELETE | Bearer | None | Minimal | **NO** | No | H4 |
| 6 | `/api/billing/checkout` | POST | Bearer | None | Partial | Yes | No | L1 |
| 7 | `/api/billing/portal` | POST | Bearer | None | None needed | Yes | No | Clean |
| 8 | `/api/webhooks/stripe` | POST | Stripe sig | N/A | Stripe SDK | Yes | Yes (justified) | L2 |
| 9 | `/api/journal/import-mt5` | POST | Bearer | None | Good | Mostly | No | M4, L3 |
| 10 | `/api/news` | GET | **NONE** | ISR 5min | N/A | Yes | No | L4 |
| 11 | `/api/cron/calendar-sync` | POST/GET | CRON_SECRET | N/A | N/A | **NO** | Yes (justified) | H5 |
| 12 | `/api/cron/calendar-sync-pm` | POST/GET | CRON_SECRET | N/A | N/A | **NO** | Yes (justified) | H5 |
| 13 | `/api/cron/narrative-update` | POST | CRON_SECRET | N/A | Minimal | **NO** | Yes (justified) | H5 |
| 14 | `/api/cron/rates-sync` | POST/GET | CRON_SECRET | N/A | N/A | **NO** | Yes (justified) | H5 |
| 15 | `/api/cron/headlines-sync` | POST/GET | CRON_SECRET | N/A | N/A | **NO** | Yes (justified) | H5 |
| 16 | `/api/cron/weekly-briefing` | POST/GET | CRON_SECRET | N/A | N/A | **NO** | Yes (justified) | H5 |
| 17 | `/api/macro/alerts` | GET | **NONE** | **NONE** | Minimal | Yes (sanitized) | No (anon) | H6 |
| 18 | `/api/macro/history` | GET | **NONE** | **NONE** | None | Yes (sanitized) | No (anon) | H6 |
| 19 | `/api/macro/compare` | GET | **NONE** | **NONE** | Minimal | No error handling | No (anon) | H6 |
| 20 | `/api/macro/rates` | GET | **NONE** | **NONE** | None | Yes (sanitized) | No (anon) | H6 |
| 21 | `/api/macro/panorama` | GET | **NONE** | **NONE** | Minimal | Yes (sanitized) | No (anon) | H6 |
| 22 | `/api/macro/calendar` | GET | **NONE** | **NONE** | Minimal | Partial | **Yes (auto-sync!)** | C4 |
| 23 | `/api/macro/headlines` | GET | **NONE** | **NONE** | Partial | Partial | **Yes (live persist!)** | C5 |
| 24 | `/api/macro/check-rate-update` | GET | **NONE** | **NONE** | None | **NO** | **Yes** | C6, H7 |
| 25 | `/api/macro/refresh-rates` | POST | Bearer | None | None | **NO** | Yes (justified) | H8 |
| 26 | `/api/macro/refresh-calendar` | POST | Bearer | None | Minimal | **NO** | Yes (justified) | H8 |
| 27 | `/api/macro/regenerate-report` | POST | Bearer | 5min cooldown | Minimal | **NO** | Yes (justified) | M5 |

---

## CRITICAL Findings

### [CRITICAL] C1: In-Memory Rate Limiter on AI Coach is Ineffective on Serverless
- **File:** `app/api/ai/coach/route.ts:21-33`
- **Description:** The `rateLimitMap` is a JavaScript `Map` stored in module scope. On Vercel serverless, each cold start creates a new empty Map. An attacker can bypass the 2 req/min limit by simply waiting for cold starts or hitting different serverless instances.
- **Impact:** Unlimited Anthropic API calls, potentially costing hundreds of dollars per hour. The DB-level `ai_usage` quota helps but only limits monthly totals, not burst abuse.
- **Fix:** Replace with Upstash Redis rate limiter (`@upstash/ratelimit`) or use Supabase RPC-based rate limiting with a `last_request_at` column.
- **Effort:** Medium

### [CRITICAL] C2: `.single()` Used in Conversations POST (Known Issue Confirmed)
- **File:** `app/api/ai/conversations/route.ts:41`
- **Description:** Line 41 uses `.single()` after an INSERT. If the INSERT fails due to a constraint violation or returns no rows, `.single()` throws a PGRST116 error that crashes the request with an unhandled error. The project convention explicitly forbids `.single()` for queries that may return null.
- **Impact:** Unhandled 500 errors. If a race condition causes a duplicate insert, the entire route crashes instead of returning a graceful error.
- **Fix:** Change `.single()` to `.maybeSingle()` and handle the null case.
- **Effort:** Small

### [CRITICAL] C3: Analyst Run Leaks Raw Error Strings via SSE
- **File:** `app/api/analyst/run/route.ts:93-96`
- **Description:** On error, the route sends `String(err)` directly to the SSE stream: `data: {"type":"error","data":"Error: ..."}`. This can leak internal stack traces, file paths, API keys in error messages, or Supabase connection strings.
- **Impact:** Information disclosure. Attacker can trigger errors to enumerate internal infrastructure details.
- **Fix:** Replace `String(err)` with a sanitized error message: `"Analysis failed. Please try again."`.
- **Effort:** Small

### [CRITICAL] C4: Public GET `/api/macro/calendar` Uses Service Role Key Without Auth
- **File:** `app/api/macro/calendar/route.ts:17-21, 78-89`
- **Description:** This route is completely public (no auth check). When the DB is empty, it falls back to `getSupabaseAdmin()` (line 79) which uses `SUPABASE_SERVICE_ROLE_KEY` to write events. Any unauthenticated user can trigger this code path, which performs writes to the database using the service role, bypassing all RLS policies.
- **Impact:** An attacker can trigger arbitrary writes to `economic_events` via the service role by timing requests when the DB is empty or the week changes. The scraper output is inserted without RLS protection.
- **Fix:** Remove the auto-sync fallback from the public GET route entirely. Calendar data should only be populated via authenticated cron jobs. If auto-sync is needed, gate it behind Bearer auth.
- **Effort:** Small

### [CRITICAL] C5: Public GET `/api/macro/headlines` Uses Service Role Key Without Auth
- **File:** `app/api/macro/headlines/route.ts:99-125, 165-190`
- **Description:** Similar to C4. The `?live=1` parameter and the empty-DB fallback both create a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (lines 100-102, 166-168) to persist headlines. This happens on a completely unauthenticated GET endpoint.
- **Impact:** Any anonymous user can trigger `?live=1` to force external HTTP fetches (RSS scraping) and service-role writes to `macro_headlines`. This is both a DoS vector (triggering expensive scraping) and an RLS bypass.
- **Fix:** Remove service role writes from this public endpoint. Either require Bearer auth for `?live=1`, or have the cron job handle all persisting.
- **Effort:** Medium

### [CRITICAL] C6: Public GET `/api/macro/check-rate-update` Uses Service Role Key, No Auth, Triggers External Scraping
- **File:** `app/api/macro/check-rate-update/route.ts:8-12, 18`
- **Description:** This route is a GET with **zero authentication**. It uses `SUPABASE_SERVICE_ROLE_KEY` and triggers external scraping of TradingEconomics (line 75: `scrapeTradingEconomicsRates()`). Any anonymous user can call this endpoint repeatedly.
- **Impact:**
  1. **Cost amplification:** Each call triggers an external HTTP scrape, which may consume Apify credits or get the server IP blocked by TradingEconomics.
  2. **RLS bypass:** Service role writes to `central_bank_rates` without any user context.
  3. **DoS:** No rate limiting means an attacker can hammer this endpoint.
  4. **Error leakage:** Line 136 returns `err.message` to the caller.
- **Fix:** Add `verifyCronAuth()` or Bearer auth. This route appears designed for cron use but lacks the auth guard that all other cron routes have.
- **Effort:** Small

---

## HIGH Findings

### [HIGH] H1: Account Deletion Data Cascade May Miss Tables
- **File:** `app/api/account/delete/route.ts:33-45`
- **Description:** The deletion cascade is hardcoded as a list of tables. New tables added to the schema (e.g., `ai_coach_conversations`, `analyst_reports`, `adaptive_alerts`) are NOT included in the deletion list. When a user deletes their account, orphaned data remains.
- **Impact:** GDPR compliance violation -- user data persists after account deletion. Also, the `ai_coach_conversations` table likely has a FK to `user_id`, so the auth user deletion at line 57 may fail if FK constraints exist.
- **Fix:** Add `ai_coach_conversations`, `analyst_reports`, and any other user-owned tables to the deletion cascade. Consider using a Supabase DB function with `CASCADE` instead of manual table-by-table deletion.
- **Effort:** Medium

### [HIGH] H2: Conversations Route Leaks Supabase Error Messages
- **File:** `app/api/ai/conversations/route.ts:19, 43`
- **Description:** Both GET (line 19) and POST (line 43) return `error.message` directly in the response body. Supabase error messages can contain table names, column names, constraint names, and query details.
- **Impact:** Information disclosure. An attacker can craft requests to trigger specific errors and enumerate the database schema.
- **Fix:** Replace `error.message` with generic error strings: `"Failed to load conversations"`, `"Failed to create conversation"`.
- **Effort:** Small

### [HIGH] H3: Analyst Run Uses Service Role Without Ownership Check on Insert
- **File:** `app/api/analyst/run/route.ts:59-64`
- **Description:** The route authenticates the user via Bearer token but then uses a service role client to insert the report (line 59-64). The `user.id` from the Bearer token is used in the insert, which is correct. However, there is no subscription/tier check -- any authenticated user (including free tier) can generate unlimited analyst reports, each costing an Anthropic API call.
- **Impact:** Free-tier users can abuse the analyst endpoint to generate expensive Claude API calls. No quota enforcement exists for this feature.
- **Fix:** Add tier gating similar to AI Coach (check subscription plan, enforce monthly quota via `ai_usage` or a dedicated counter).
- **Effort:** Medium

### [HIGH] H4: Analyst History Leaks Supabase Error Messages
- **File:** `app/api/analyst/history/route.ts:34-36, 79-81`
- **Description:** Both GET and DELETE return `error.message` directly to the client.
- **Impact:** Same as H2 -- schema enumeration via error message analysis.
- **Fix:** Return generic error messages.
- **Effort:** Small

### [HIGH] H5: All 6 Cron Routes Leak `error.message` in Error Responses
- **Files:**
  - `app/api/cron/calendar-sync/route.ts:213`
  - `app/api/cron/calendar-sync-pm/route.ts:65`
  - `app/api/cron/narrative-update/route.ts:85`
  - `app/api/cron/rates-sync/route.ts:84`
  - `app/api/cron/headlines-sync/route.ts:270`
  - `app/api/cron/weekly-briefing/route.ts:120`
- **Description:** All cron error handlers use `error instanceof Error ? error.message : "Unknown error"`. While these routes are protected by `verifyCronAuth`, the error messages may contain sensitive info (API keys, DB connection errors) that gets logged in Vercel's function logs and returned in responses.
- **Impact:** If an attacker somehow obtains the CRON_SECRET (or if Vercel logs are exposed), detailed error messages reveal infrastructure details.
- **Fix:** Log the full error server-side but return a generic `"Internal error"` in the response body.
- **Effort:** Small

### [HIGH] H6: 7 Public Macro GET Routes Have Zero Rate Limiting (Scraping Risk)
- **Files:**
  - `app/api/macro/alerts/route.ts`
  - `app/api/macro/history/route.ts`
  - `app/api/macro/compare/route.ts`
  - `app/api/macro/rates/route.ts`
  - `app/api/macro/panorama/route.ts`
  - `app/api/macro/calendar/route.ts`
  - `app/api/macro/headlines/route.ts`
- **Description:** All 7 macro GET routes are completely public with no authentication and no rate limiting. They return valuable financial intelligence (economic calendar, central bank rates, market narratives, headlines).
- **Impact:** A competitor or scraper can harvest all macro intelligence data for free. Each request hits Supabase, so a DDoS on these endpoints translates directly to Supabase usage costs. The `compare` endpoint is especially expensive as it runs 4 parallel queries.
- **Fix:**
  1. Add ISR caching (e.g., `revalidate = 60`) to reduce DB hits.
  2. Add Vercel Edge rate limiting or Upstash rate limiter.
  3. Consider requiring Bearer auth for PRO-only data (panorama, headlines, alerts).
- **Effort:** Medium

### [HIGH] H7: `check-rate-update` Error Response Leaks Internal Errors
- **File:** `app/api/macro/check-rate-update/route.ts:136`
- **Description:** Returns `err.message` directly to caller on a public unauthenticated endpoint.
- **Impact:** Combined with C6, anyone can trigger errors and read internal details.
- **Fix:** Return generic error. Add auth first (C6).
- **Effort:** Small

### [HIGH] H8: `refresh-rates` and `refresh-calendar` Leak Error Messages
- **Files:**
  - `app/api/macro/refresh-rates/route.ts:80`
  - `app/api/macro/refresh-calendar/route.ts:162`
- **Description:** These routes are Bearer-authenticated but still return `error.message` to authenticated users.
- **Impact:** Authenticated users can trigger errors to learn about internal infrastructure (Apify failures, scraper errors, DB schema details).
- **Fix:** Return generic error messages. Log details server-side only.
- **Effort:** Small

---

## MEDIUM Findings

### [MEDIUM] M1: Account Deletion Has No Confirmation/Re-authentication
- **File:** `app/api/account/delete/route.ts:6`
- **Description:** Account deletion only requires a valid Bearer token. There is no re-authentication step (password confirmation), no CAPTCHA, and no cooling-off period. A stolen/leaked JWT can immediately and irreversibly delete a user's entire account.
- **Impact:** If an attacker obtains a user's JWT (e.g., via XSS, shared computer, token leak), they can permanently delete the account with a single HTTP request.
- **Fix:** Require password re-entry or add a 24-hour grace period with email confirmation before permanent deletion.
- **Effort:** Medium

### [MEDIUM] M2: AI Coach Console Logs May Contain Sensitive Trade Data
- **File:** `app/api/ai/coach/route.ts:175, 233, 278`
- **Description:** `console.warn` at lines 175 and 233 log caught errors which may contain trade data context. Line 278 logs the full Anthropic error which could contain the prompt (with user trade data) in certain error scenarios.
- **Impact:** Vercel function logs may contain PII (user trade data, account names, P&L figures).
- **Fix:** Sanitize logged errors to exclude user data. Log only error type/code, not full error objects.
- **Effort:** Small

### [MEDIUM] M3: Conversations PATCH/DELETE Don't Validate `id` Format
- **File:** `app/api/ai/conversations/route.ts:56-57, 77-78`
- **Description:** The `id` parameter in PATCH and DELETE is accepted as-is without UUID format validation. While Supabase will reject invalid UUIDs, the error message (which is returned to the client per H2) may leak schema information.
- **Impact:** Combined with H2, an attacker can send malformed IDs to trigger error messages that reveal table/column names.
- **Fix:** Add UUID regex validation before querying: `if (!/^[0-9a-f-]{36}$/i.test(id))`.
- **Effort:** Small

### [MEDIUM] M4: Import MT5 Error Handler Logs Full Error Object
- **File:** `app/api/journal/import-mt5/route.ts:506, 518-519`
- **Description:** Line 506 logs `console.error("[import-mt5] error:", err)` which includes the full error with stack trace. Lines 518-519 store `err.message` and `String(err)` in the `ingestion_logs` table's `meta` JSONB column.
- **Impact:** If the error includes file content or parsed trade data, this gets persisted in the DB and visible in logs.
- **Fix:** Sanitize error data before storing in `ingestion_logs.meta`. Log only the error class/code.
- **Effort:** Small

### [MEDIUM] M5: Regenerate Report Leaks Error Messages to Authenticated Users
- **File:** `app/api/macro/regenerate-report/route.ts:99, 157, 163, 178`
- **Description:** Multiple error paths return `error.message` or Supabase error messages to the client. Lines 99 and 157 return `updateErr.message` / `insertErr.message` directly.
- **Impact:** Authenticated users can learn DB schema details from error responses.
- **Fix:** Return generic errors.
- **Effort:** Small

### [MEDIUM] M6: Macro Calendar Uses Anon Key for Reads but Service Role for Writes
- **File:** `app/api/macro/calendar/route.ts:9-12, 17-21`
- **Description:** The route creates two Supabase clients -- one with anon key (for reads) and one with service role key (for auto-sync writes). This mixed approach means RLS applies to reads but not to writes.
- **Impact:** Inconsistent security model. The auto-sync bypass (C4) is made worse by this design.
- **Fix:** Remove service role usage from this public endpoint entirely.
- **Effort:** Small

### [MEDIUM] M7: Analyst Run Logs User ID to Console
- **File:** `app/api/analyst/run/route.ts:63`
- **Description:** `console.log("[analyst/run] Saving report for user:", user.id, ...)` logs the user's UUID to Vercel function logs on every successful analysis.
- **Impact:** User IDs in logs can be correlated with other data if logs are compromised.
- **Fix:** Remove or reduce logging verbosity for user identifiers.
- **Effort:** Small

---

## LOW Findings

### [LOW] L1: Billing Checkout Accepts Unvalidated `origin` Header
- **File:** `app/api/billing/checkout/route.ts:45`
- **Description:** `req.headers.get("origin") || "http://localhost:3000"` is used to construct `success_url` and `cancel_url` for Stripe. While Stripe validates redirect URLs against its dashboard allowlist, this pattern could be problematic if the Stripe dashboard has overly permissive URL settings.
- **Impact:** Low -- Stripe's own validation provides defense in depth.
- **Fix:** Hardcode the origin from `process.env.NEXT_PUBLIC_APP_URL` instead of trusting the request header.
- **Effort:** Small

### [LOW] L2: Stripe Webhook Logs Full Error Object
- **File:** `app/api/webhooks/stripe/route.ts:121`
- **Description:** `console.error("[stripe-webhook] Processing error:", err)` logs the full error which might include Stripe customer/subscription details.
- **Impact:** Stripe data in Vercel logs. Low because these logs are internal.
- **Fix:** Log only error code/type.
- **Effort:** Small

### [LOW] L3: Import MT5 Development-Only Console Logs
- **File:** `app/api/journal/import-mt5/route.ts:236-245`
- **Description:** Development-only diagnostic logs include trade data (`external_id`, `symbol`, `pnl_usd`). Protected by `NODE_ENV === "development"` check.
- **Impact:** Low -- only fires in development. But if `NODE_ENV` is misconfigured in production, trade data would be logged.
- **Fix:** Acceptable as-is. Consider removing before production launch.
- **Effort:** Small

### [LOW] L4: News API Route Exposes Missing Key Status
- **File:** `app/api/news/route.ts:65-68`
- **Description:** Returns `{ error: "Missing NEWS_API_KEY" }` when the API key is not configured. This tells attackers the exact env var name needed.
- **Impact:** Low -- env var name is not sensitive, but it's unnecessary information disclosure.
- **Fix:** Return empty data without error message: `{ data: [] }`.
- **Effort:** Small

---

## Additional Security Checks

### SQL Injection: PASS
No raw SQL queries found. All database operations use the Supabase JS client with parameterized queries (`.eq()`, `.in()`, `.filter()`, etc.). The `scrapeForexFactoryCalendar` and other scrapers produce data that is inserted via the Supabase client, which handles parameterization.

### SSRF: PARTIAL CONCERN
- `/api/macro/headlines?live=1` triggers external HTTP fetches to RSS feeds (ForexLive, Reuters, TradingEconomics, Truth Social) on a public unauthenticated endpoint. While the URLs are hardcoded (not user-controlled), the lack of auth means anyone can trigger these external fetches.
- `/api/ai/coach` fetches from `/api/news` internally (line 182-183), which is safe (same-origin).

### Path Traversal: PASS
No routes use user input in file paths. The import-mt5 route processes file uploads via `FormData` and `file.arrayBuffer()` without writing to disk.

### Denial of Service Vectors:
1. **`/api/macro/check-rate-update`** (C6): No auth, triggers external scraping.
2. **`/api/macro/headlines?live=1`** (C5): No auth, triggers 4 parallel external HTTP fetches + translation API calls.
3. **`/api/analyst/run`** (H3): No quota, 120s timeout, Anthropic API call per request.
4. **7 public macro GET routes** (H6): No rate limiting, each hits Supabase.
5. **`/api/macro/calendar` auto-sync** (C4): Triggers scraping + batch DB writes.

### Console.error Audit (84 instances claimed):
Reviewed all routes. Key concerns:
- 12 instances log full error objects (may contain sensitive context)
- 3 instances log user IDs
- 6 instances in cron routes log scraper results (non-sensitive)
- Remaining instances log only error messages or codes (acceptable)

---

## Prioritized Remediation Plan

### Phase 1: Immediate (This Sprint) -- CRITICAL fixes
| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| C6 | `check-rate-update` public + service role | Add `verifyCronAuth()` | 5 min |
| C4 | `calendar` auto-sync with service role | Remove auto-sync from public GET | 15 min |
| C5 | `headlines` service role writes on public GET | Gate `?live=1` behind auth; remove service role from fallback | 30 min |
| C3 | `analyst/run` leaks `String(err)` | Replace with generic message | 5 min |
| C2 | `.single()` in conversations | Change to `.maybeSingle()` | 2 min |

### Phase 2: This Week -- HIGH fixes
| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| H2,H4,H5,H7,H8 | Error message leakage (13 routes) | Sanitize all error responses | 1 hour |
| H6 | Public macro routes no rate limiting | Add ISR caching + consider auth for PRO data | 2 hours |
| H3 | Analyst has no quota | Add tier check + monthly quota | 2 hours |
| H1 | Account deletion misses tables | Add missing tables to cascade | 30 min |
| C1 | In-memory rate limiter | Replace with Upstash Redis | 2 hours |

### Phase 3: Next Sprint -- MEDIUM/LOW fixes
| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| M1 | No re-auth on account deletion | Add password confirmation flow | 4 hours |
| M2-M7 | Various logging/validation | Sanitize logs, add UUID validation | 2 hours |
| L1-L4 | Minor issues | Hardcode origin, clean up logs | 1 hour |

---

## Service Role Key Usage Summary

| Route | Uses Service Role | Justified? | Risk |
|-------|------------------|------------|------|
| `account/delete` | Yes | Yes -- needs admin.deleteUser() | Low (auth-gated) |
| `analyst/run` | Yes | Yes -- bypasses RLS for insert | Low (auth-gated) |
| `webhooks/stripe` | Yes | Yes -- no user context in webhooks | Low (sig-verified) |
| `cron/*` (6 routes) | Yes | Yes -- cron jobs need admin access | Low (secret-gated) |
| `macro/calendar` | Yes | **NO** -- public auto-sync | **CRITICAL** |
| `macro/headlines` | Yes | **NO** -- public persist | **CRITICAL** |
| `macro/check-rate-update` | Yes | **NO** -- public, no auth | **CRITICAL** |
| `macro/refresh-rates` | Yes | Yes -- needs admin for upsert | Low (auth-gated) |
| `macro/refresh-calendar` | Yes | Yes -- needs admin for upsert | Low (auth-gated) |
| `macro/regenerate-report` | Yes | Yes -- needs admin for upsert | Low (auth-gated) |

---

## Compliance Notes

### GDPR (Right to Erasure)
- **Finding H1** directly impacts GDPR compliance. Account deletion does not remove data from `ai_coach_conversations`, `analyst_reports`, or any newer tables. This must be fixed before any EU user data processing.

### PCI DSS
- No credit card data is stored or processed directly. All payment processing is delegated to Stripe. Stripe customer IDs and subscription IDs are stored, which is acceptable.

### Data Retention
- `macro_headlines` has a 7-day auto-prune (good).
- `ingestion_logs` has no retention policy (may accumulate indefinitely).
- `analyst_reports` has no retention policy.

---

*End of audit. All 27 route files were read and analyzed exhaustively.*
