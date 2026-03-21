# Security Audit: API Routes
**Date:** 2026-03-21
**Auditor:** Claude Opus 4.6
**Scope:** All 17 routes under `app/api/`

---

## Executive Summary

- **17 routes** audited across 6 categories (auth, billing, cron, macro, journal, news)
- **2 CRITICAL**, **3 HIGH**, **4 MEDIUM**, **2 LOW** findings
- The most severe issue: 6 macro routes use service_role key for public read endpoints with zero authentication

---

## Findings

### CRITICAL-1: Service Role Key on Unauthenticated Public Endpoints
**Severity:** CRITICAL
**Files:**
- `app/api/macro/calendar/route.ts:8-13`
- `app/api/macro/compare/route.ts:7-12`
- `app/api/macro/alerts/route.ts:7-12`
- `app/api/macro/panorama/route.ts:7-12`
- `app/api/macro/history/route.ts:7-12`
- `app/api/macro/rates/route.ts:7-12`

**Issue:** All 6 macro GET routes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) with **zero authentication**. Any anonymous user can call these endpoints. While the data is intended to be public, the service role key grants full DB access -- if any of these routes were modified to accept user input for table/column names, it would be catastrophic.

**Recommendation:** Use anon key instead of service_role for these read-only public endpoints, or add RLS policies that allow public SELECT on these tables and use the anon key.

---

### CRITICAL-2: No Input Sanitization on Cron `event_id` Parameter
**Severity:** CRITICAL
**File:** `app/api/cron/narrative-update/route.ts:28-29`

**Issue:** The `event_id` from the request body is passed directly to a Supabase `.eq("id", eventId)` query with no UUID validation. While Supabase parameterizes queries (preventing SQL injection), an attacker who bypasses cron auth could pass arbitrary values. Combined with the service_role key, this queries without RLS.

**Recommendation:** Validate `event_id` as UUID format before querying.

---

### HIGH-1: Cron Auth Uses Simple String Comparison (Not Timing-Safe)
**Severity:** HIGH
**File:** `lib/macro/cron-auth.ts:18`

**Issue:** `verifyCronAuth` compares `authHeader === \`Bearer ${cronSecret}\`` using JavaScript `===`, which is vulnerable to timing attacks. An attacker could theoretically determine the secret character-by-character by measuring response times.

**Recommendation:** Use `crypto.timingSafeEqual()` for secret comparison, similar to what was done for the TradingView webhook.

---

### HIGH-2: No File Size Limit on MT5 Import
**Severity:** HIGH
**File:** `app/api/journal/import-mt5/route.ts`

**Issue:** No explicit file size limit is enforced. The route reads the entire file into memory via `file.arrayBuffer()` (line 90). A malicious user could upload a very large file to exhaust server memory. Next.js has a default body size limit of 4MB for API routes, but this uses `formData()` which may have different limits, and the `maxDuration = 300` (5 minutes) gives ample time for abuse.

**Recommendation:** Add an explicit file size check before parsing:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json({ error: "File too large" }, { status: 413 });
}
```

---

### HIGH-3: Error Messages Leak Internal Details in Cron Routes
**Severity:** HIGH
**Files:**
- `app/api/cron/rates-sync/route.ts:38` -- `error.message` exposed
- `app/api/cron/weekly-briefing/route.ts:79,86,100` -- Supabase error messages exposed
- `app/api/cron/calendar-sync/route.ts:82,99,104` -- Supabase error messages + event UIDs exposed
- `app/api/macro/calendar/route.ts:28` -- `error.message` exposed
- `app/api/macro/alerts/route.ts:23` -- `error.message` exposed
- `app/api/macro/panorama/route.ts:26` -- `error.message` exposed

**Issue:** Supabase error messages can contain table names, column names, constraint names, and other schema details. These are returned directly in API responses.

**Recommendation:** Log the full error server-side, return generic "Internal error" to client.

---

### MEDIUM-1: News Route Has No Authentication
**Severity:** MEDIUM
**File:** `app/api/news/route.ts:62`

**Issue:** The `/api/news` GET endpoint requires no authentication. While it's a read-only proxy, it allows anonymous users to consume your NewsAPI quota.

**Recommendation:** Add Bearer token auth or at minimum rate limiting.

---

### MEDIUM-2: News Route Has No Rate Limiting
**Severity:** MEDIUM
**File:** `app/api/news/route.ts`

**Issue:** No rate limiting. The ISR `revalidate = 300` provides some caching, but direct requests can still trigger upstream fetches.

**Recommendation:** Add per-IP or per-user rate limiting.

---

### MEDIUM-3: Account Delete Uses User's Own Token for Data Deletion
**Severity:** MEDIUM
**File:** `app/api/account/delete/route.ts:47-49`

**Issue:** The route deletes from tables using the user's own Supabase client (with RLS). If any table's RLS policy doesn't have a DELETE policy for the user, data will silently remain. The route does use service_role for auth user deletion (line 53-56), which is correct, but the data cleanup could be incomplete.

**Recommendation:** Use service_role for the data deletion phase as well, since the user has already been authenticated. Add verification that all deletes succeeded before deleting the auth user.

---

### MEDIUM-4: `week` Query Parameter Not Validated on Macro Routes
**Severity:** MEDIUM
**Files:**
- `app/api/macro/calendar/route.ts:17`
- `app/api/macro/panorama/route.ts:17`
- `app/api/macro/alerts/route.ts:17`
- `app/api/macro/compare/route.ts:16-17` (weekA, weekB)

**Issue:** The `week`, `weekA`, `weekB` query parameters are passed directly to Supabase `.filter()` with no format validation. While Supabase parameterizes queries (no SQL injection), malformed dates could cause unexpected behavior.

**Recommendation:** Validate as ISO date format (YYYY-MM-DD).

---

### LOW-1: In-Memory Rate Limiter Won't Work in Serverless
**Severity:** LOW
**File:** `app/api/ai/coach/route.ts:21-33`

**Issue:** The `rateLimitMap` is an in-memory `Map`. On Vercel (serverless), each function invocation may run in a different container, so the rate limit state is not shared. A user could bypass the 2 req/min limit by hitting different instances.

**Recommendation:** Use Vercel KV, Upstash Redis, or a database-backed rate limiter for production.

---

### LOW-2: TradingView Webhook Route Missing from Production
**Severity:** LOW
**File:** Referenced in CLAUDE.md but `app/api/webhooks/tradingview/route.ts` does not exist in main branch (only in worktree branches).

**Issue:** The route is documented but not deployed. When it is merged, ensure it uses `crypto.timingSafeEqual()` (it does in the worktree versions).

---

## Positive Findings (What's Done Well)

| Area | Assessment |
|------|-----------|
| **Auth on user routes** | All user-facing routes (ai/coach, billing/checkout, billing/portal, account/delete, journal/import-mt5) properly validate Bearer token and call `getUser()` |
| **IDOR prevention** | `validateAccountOwnership()` used in ai/coach and import-mt5; billing routes filter by `user_id` from authenticated session |
| **SQL injection** | No raw SQL anywhere; all queries use Supabase client parameterized methods |
| **Stripe webhook** | Proper `constructEvent()` signature verification + idempotency check via `stripe_event_id` |
| **Security headers** | HSTS, X-Frame-Options DENY, nosniff, XSS protection, Referrer-Policy, Permissions-Policy all configured in `next.config.mjs` |
| **UUID validation** | MT5 import validates `accountId` format with regex |
| **Input validation** | AI Coach has thorough validation: type whitelist, message count/length limits, total length cap |
| **Error sanitization** | User-facing routes (ai/coach, billing, account/delete) return generic error messages |
| **Service role usage** | Stripe webhook and account delete correctly use service_role where needed (no user context) |
| **File type validation** | MT5 import checks file extension against whitelist (csv/html/xlsx) |

---

## Priority Remediation Order

1. **CRITICAL-1** -- Switch macro routes from service_role to anon key (30 min fix)
2. **HIGH-1** -- Add timing-safe comparison to cron auth (10 min fix)
3. **HIGH-2** -- Add file size limit to MT5 import (5 min fix)
4. **HIGH-3** -- Sanitize error messages in cron/macro routes (20 min fix)
5. **CRITICAL-2** -- Add UUID validation to narrative-update event_id (5 min fix)
6. **MEDIUM-1/2** -- Add auth or rate limiting to news route (30 min fix)
7. **MEDIUM-3** -- Use service_role for account delete data phase (15 min fix)
8. **MEDIUM-4** -- Validate date format on macro query params (10 min fix)
