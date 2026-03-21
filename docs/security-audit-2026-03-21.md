# Security Audit Report — wealth.Investing
**Date:** 2026-03-21
**Audited by:** Claude Code (4 parallel agents + Supabase advisor)
**Scope:** Auth, API routes, frontend, database RLS, secrets management

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH     | 2 |
| MEDIUM   | 5 |
| LOW      | 6 |
| PASS     | 14 |

**Overall posture:** Good. User-facing routes enforce Bearer auth + `getUser()`. RLS enabled on all 20 tables. No hardcoded secrets. Stripe webhook uses proper signature verification. Security headers well configured. The main risks are around macro API routes using service_role key unnecessarily, a timing attack in cron auth, and missing CSP.

---

## CRITICAL

### C1. `macro_events` INSERT policy allows unrestricted access
- **Location:** Supabase RLS policy `"Service role can insert macro events"`
- **Issue:** Policy has `WITH CHECK (true)` applied to `{public}` role — **any anonymous user can INSERT rows into `macro_events`**. The policy name says "service role" but the `roles` field is `{public}`, not `{service_role}`.
- **Impact:** Data poisoning — anyone can inject fake economic events into the calendar.
- **Fix:** Change policy to `WITH CHECK (auth.role() = 'service_role'::text)` (matching other macro tables like `economic_events`, `weekly_panoramas`).

---

## HIGH

### H1. Cron auth uses `===` instead of `timingSafeEqual()`
- **Location:** `lib/macro/cron-auth.ts:18`
- **Issue:** `CRON_SECRET` comparison uses string `===` which is vulnerable to timing attacks. An attacker can brute-force the secret one character at a time.
- **Fix:** Use `crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))`.

### H2. MT5 import has no file size limit
- **Location:** `app/api/journal/import-mt5/route.ts`
- **Issue:** No explicit file size validation before processing. A malicious user could upload a very large file causing memory exhaustion on the serverless function.
- **Fix:** Add `Content-Length` check or use Next.js body size config. Reject files > 10MB.

---

## MEDIUM

### M1. 6 macro API routes use service_role key unnecessarily
- **Location:** `app/api/macro/{calendar,alerts,panorama,rates,history,compare}/route.ts`
- **Issue:** All use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS, even though the data is public. If these tables ever get sensitive columns, they'd be fully exposed. Also, any bug in these routes could be leveraged to access other tables.
- **Fix:** Add anonymous `SELECT` RLS policies to these tables, then switch to anon key.

### M2. `.single()` instead of `.maybeSingle()` in import route
- **Location:** `app/api/journal/import-mt5/route.ts:160`
- **Issue:** Personal account lookup uses `.single()`. If user has no personal account, throws PGRST116 error instead of returning null gracefully.
- **Fix:** Replace with `.maybeSingle()`.

### M3. `getSession()` used instead of `getUser()` in AuthGate
- **Location:** `components/auth/AuthGate.tsx:95,180`
- **Issue:** `getSession()` reads JWT from localStorage without server verification. Per Supabase docs, `getUser()` should be used for security-critical checks as it validates against the server.
- **Fix:** Use `getUser()` for the initial auth check.

### M4. Macro API endpoints have zero rate limiting
- **Location:** All `app/api/macro/*/route.ts`
- **Issue:** Completely unauthenticated GET endpoints with no rate limiting. Anyone can scrape all macro data.
- **Fix:** Add rate limiting via Vercel Edge Middleware or require auth.

### M5. Cron/macro error responses leak internal details
- **Location:** `app/api/cron/*/route.ts`, `app/api/macro/*/route.ts`
- **Issue:** Error responses include raw Supabase error messages containing schema details.
- **Fix:** Return generic error messages; log details server-side only.

---

## LOW

### L1. 4 SECURITY DEFINER functions missing `search_path`
- **Location:** Supabase functions: `handle_new_user`, `calc_drawdown`, `increment_ai_usage`, `decrement_ai_usage`
- **Issue:** Mutable search_path in SECURITY DEFINER functions could allow search path manipulation.
- **Fix:** Add `SET search_path = public` to each function. [Docs](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

### L2. Leaked password protection disabled
- **Location:** Supabase Auth settings
- **Issue:** HaveIBeenPwned password checking is disabled.
- **Fix:** Enable in Supabase Dashboard → Auth → Settings → Password Security.

### L3. Missing Content-Security-Policy header
- **Location:** `next.config.mjs`
- **Issue:** No CSP header configured. Combined with localStorage token storage, XSS risk is elevated.
- **Fix:** Add basic CSP: `default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' *.supabase.co *.stripe.com *.sentry.io`

### L4. Middleware is a no-op
- **Location:** `middleware.ts:5`
- **Issue:** Matches `/app/**` but only calls `NextResponse.next()`. Protected page HTML/JS is served to unauthenticated users before client-side AuthGate redirects.
- **Fix:** Consider adding server-side session check in middleware.

### L5. `router.replace()` used in auth callback error path
- **Location:** `app/auth/callback/page.tsx:56`
- **Issue:** Error path uses `router.replace("/login?error=callback")` instead of `window.location.href`, violating project rules.
- **Fix:** Replace with `window.location.href = "/login?error=callback"`.

### L6. Duplicate SELECT policies on 4 tables
- **Location:** `adaptive_alerts`, `central_bank_rates`, `weekly_panoramas`, `weekly_snapshots`
- **Issue:** Each has two identical `SELECT` policies (`"Public read ..."` and `"public_read"`). Not a security risk, but creates confusion.
- **Fix:** Remove duplicate policies.

---

## PASS (Notable Good Practices)

| # | Area | Detail |
|---|------|--------|
| P1 | RLS | All 20 tables have RLS enabled |
| P2 | User data isolation | All user-data queries filter by `auth.uid() = user_id` |
| P3 | API auth pattern | User-facing routes extract Bearer token + `getUser()` server-side |
| P4 | IDOR prevention | `validateAccountOwnership()` checks account belongs to user |
| P5 | Stripe webhook | `constructEvent()` signature verification + idempotency check |
| P6 | Open redirect | Auth callback validates `next` param: `startsWith("/") && !startsWith("//")` |
| P7 | No hardcoded secrets | No API keys, tokens, or credentials in committed code |
| P8 | .gitignore | `.env*.local` properly excluded |
| P9 | XSS prevention | No `dangerouslySetInnerHTML` usage; React's default escaping used |
| P10 | Stripe client-side | No client-side Stripe SDK; all payment handling is server-side |
| P11 | Security headers | HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy all set |
| P12 | Token handling | Credentials only sent via Supabase HTTPS calls, never logged |
| P13 | TradingView webhook | Uses `crypto.timingSafeEqual()` for secret comparison |
| P14 | Account delete | Service role justified; full Bearer auth first, then admin API |

---

## Remediation Priority

1. **Immediate (C1):** Fix `macro_events` INSERT policy — data poisoning risk
2. **This week (H1, H2):** Timing-safe cron auth, MT5 file size limit
3. **Next sprint (M1-M5):** Macro routes anon key, `.single()` fix, AuthGate `getUser()`, rate limiting, error sanitization
4. **Backlog (L1-L6):** Function search_path, leaked password protection, CSP, middleware, callback fix, duplicate policies
