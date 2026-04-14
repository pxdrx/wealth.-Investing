# Forensic Security Audit: Authentication & Authorization

**Date:** 2026-03-28
**Auditor:** Security Auditor Agent (Claude Opus 4.6)
**Scope:** All auth-related files in trading-dashboard
**Severity Scale:** CRITICAL > HIGH > MEDIUM > LOW > INFO

---

## Executive Summary

The auth system is **fundamentally sound** with proper patterns in AuthGate, good use of `getUser()` on API routes, and RLS enforcement. However, **6 active violations** of project security rules remain, including 1 HIGH and 5 MEDIUM findings. The most critical issue is the use of `supabase.auth.signOut()` in the account page, which the project explicitly forbids due to known freeze behavior.

**Totals:** 1 HIGH, 5 MEDIUM, 4 LOW, 5 INFO (positive findings)

---

## VIOLATIONS (Active Rule Breaches)

### [HIGH] V1. `supabase.auth.signOut()` used in account page

- **File:** `app/app/account/page.tsx:44`
- **Code:** `supabase.auth.signOut().finally(() => { window.location.replace("/login"); });`
- **Description:** Directly violates CLAUDE.md rule: "NEVER use `supabase.auth.signOut()` -- use manual localStorage cleanup." The `signOut()` call is known to freeze/hang in this codebase. Additionally uses `window.location.replace()` instead of `window.location.href`.
- **Impact:** User clicks "Sair da conta" and the browser hangs. Session tokens may not be fully cleared. Poor UX on a financial app erodes trust.
- **Fix:** Replace with the same `clearSessionAndRedirect()` pattern used in AuthGate (lines 22-33): iterate localStorage keys starting with `sb-`, remove them, then `window.location.href = "/login"`.
- **Effort:** Small (10 min)

### [MEDIUM] V2. `router.replace()` used in login auth flow

- **File:** `app/login/page.tsx:52`
- **Code:** `const t = setTimeout(() => router.replace(redirectToRef.current), 150);`
- **Description:** Violates CLAUDE.md rule: "NEVER use `router.replace()` in auth flows -- use `window.location.href`." The Next.js client-side router can cause redirect loops or race conditions with auth state during navigation.
- **Impact:** After successful login, the redirect may not fully reload auth state, causing AuthGate to see stale session data. Can cause onboarding redirect loops (documented known issue).
- **Fix:** Replace with `window.location.href = redirectToRef.current`.
- **Effort:** Small (5 min)

### [MEDIUM] V3. `router.replace()` used in AI Coach page (2 instances)

- **File:** `app/app/ai-coach/page.tsx:150`
- **Code:** `router.replace(\`/app/ai-coach?chat=${latest.id}\`);`
- **File:** `app/app/ai-coach/page.tsx:163`
- **Code:** `router.replace(\`/app/ai-coach?chat=${createJson.data.id}\`);`
- **Description:** These are URL query param updates within an already-authenticated page. While less dangerous than auth flow redirects, they still violate the project rule. However, these are navigation within `/app/**` (already behind AuthGate), so the risk is lower.
- **Impact:** Low -- these update query params for chat selection, not auth state. Could cause minor state issues if AuthGate re-checks during navigation.
- **Fix:** Use `window.history.replaceState(null, "", \`/app/ai-coach?chat=${id}\`)` to update URL without triggering navigation, or accept the risk for in-app navigation.
- **Effort:** Small (10 min)

### [MEDIUM] V4. `router.replace()` in reports redirect page

- **File:** `app/app/reports/page.tsx:10`
- **Code:** `router.replace("/app/journal");`
- **Description:** Simple redirect page, but uses router.replace within the `/app/**` protected area. Lower risk since this is not an auth flow.
- **Impact:** Minimal -- simple page redirect within authenticated area.
- **Fix:** Replace with `window.location.href = "/app/journal"` or keep as-is if accepting the risk for non-auth navigations.
- **Effort:** Small (2 min)

### [MEDIUM] V5. `.single()` instead of `.maybeSingle()` in AI conversations API

- **File:** `app/api/ai/conversations/route.ts:41`
- **Code:** `.single();`
- **Description:** Violates project rule: "Always `.maybeSingle()` for lookups that may return null." If the INSERT fails or returns no rows, this throws a PGRST116 error instead of returning null gracefully.
- **Impact:** Could cause 500 errors on conversation creation edge cases. Error message may leak Supabase internals to client.
- **Fix:** Change `.single()` to `.maybeSingle()` and add null check on result.
- **Effort:** Small (5 min)

---

## SECURITY FINDINGS

### [MEDIUM] S1. Onboarding page uses `getSession()` without `getUser()` verification

- **File:** `app/onboarding/page.tsx:84`
- **Code:** `const { data: { session } } = await supabase.auth.getSession();`
- **Description:** The onboarding gate check uses `getSession()` which reads the JWT from localStorage without server-side verification. A manipulated JWT in localStorage could bypass this check. Three additional `getSession()` calls at lines 148 and 180 are used to get the access_token for API calls (which is acceptable since the API route will verify).
- **Impact:** An attacker who can write to localStorage could trick the onboarding page into thinking they are authenticated, though the subsequent API calls (profile upsert, import) would fail server-side due to invalid token.
- **Fix:** Replace line 84 gate check with `supabase.auth.getUser()` for the authentication gate. Keep `getSession()` for extracting `access_token` for Bearer token API calls.
- **Effort:** Small (10 min)

### [LOW] S2. No-op middleware is a defense-in-depth gap

- **File:** `middleware.ts:1-11`
- **Description:** Middleware matches `/app` and `/app/:path*` but does nothing (`NextResponse.next()`). Comment says "Mantido para futura integracao com @supabase/ssr." All auth is client-side via AuthGate.
- **Impact:** If AuthGate JavaScript fails to load (CDN issue, JS error, ad blocker), the `/app/**` pages will render unprotected HTML (though data fetches will fail due to missing session). Server-side middleware could provide a safety net redirect.
- **Risk assessment:** LOW because (a) Supabase RLS prevents data access without valid JWT regardless, (b) page content without data is meaningless shells. But for a financial app, defense-in-depth matters.
- **Fix:** Implement basic server-side session cookie check in middleware using `@supabase/ssr`. Redirect to `/login` if no valid session cookie exists.
- **Effort:** Medium (requires `@supabase/ssr` integration)

### [LOW] S3. 8-hour inactivity timeout may be too long for financial app

- **File:** `components/auth/AuthGate.tsx:12`
- **Code:** `const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000;`
- **Description:** Banking/financial apps typically use 15-30 minute inactivity timeouts. 8 hours means a user who walks away from an unlocked computer leaves their trading dashboard accessible all day.
- **Impact:** If an unauthorized person accesses the unlocked device, they have 8 hours of session access to view portfolio data, trading history, and potentially trigger actions.
- **Fix:** Reduce to 30 minutes for the free tier, allow Pro users to configure up to 4 hours. Add a "remember me" option at login for users who want longer sessions.
- **Effort:** Medium (UX decision + implementation)

### [LOW] S4. Session fixation via localStorage manipulation

- **File:** `components/auth/AuthGate.tsx` (general architecture)
- **Description:** Supabase JS stores tokens in localStorage under `sb-*` keys. An attacker with XSS or physical access could inject a different user's token into localStorage. However, AuthGate now uses `getUser()` (line 95) which validates the token server-side, mitigating this for the primary auth check.
- **Impact:** Limited. The `getUser()` call validates the JWT signature server-side. A forged or expired token would be rejected. However, a stolen valid token from another session could work.
- **Mitigating factors:** (a) `getUser()` validates server-side, (b) tokens expire, (c) RLS enforces user_id matching.
- **Fix:** Consider migrating to HttpOnly cookie-based auth via `@supabase/ssr` for better XSS protection of tokens.
- **Effort:** Large (architecture change)

### [LOW] S5. Cross-user data access via `activeAccountId` localStorage manipulation

- **File:** `components/context/ActiveAccountContext.tsx` (general pattern)
- **Description:** The `activeAccountId` is stored in localStorage and determines which account's data is displayed. If an attacker changes this to another user's account ID, the Supabase queries would include that account ID in the request.
- **Impact:** **None** -- Supabase RLS policies enforce `.eq("user_id", session.user.id)` on all queries. Even if `activeAccountId` points to another user's account, the RLS policy will return zero rows, not the other user's data. This is correctly designed.
- **Fix:** No fix needed. RLS provides the security boundary, not the client-side account selector.
- **Effort:** N/A

---

## POSITIVE FINDINGS (Working Correctly)

### [PASS] P1. Open redirect protection in OAuth callback

- **File:** `app/auth/callback/page.tsx:45`
- **Code:** `const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";`
- **Verification:** This correctly blocks:
  - `next=//evil.com` -- blocked by `!next.startsWith("//")`
  - `next=https://evil.com` -- blocked by `!next.startsWith("/")`
  - `next=\evil.com` -- **passes** the check (`\e` starts with... wait, no: `\evil.com` does NOT start with `/`). PASS.
  - `next=/%2f%2fevil.com` -- the URL is already decoded by the time `searchParams.get("next")` returns it, so this becomes `next=///evil.com` which starts with `//` and is blocked. PASS.
  - `next=/\evil.com` -- starts with `/` and not `//`. This would navigate to `/\evil.com` which resolves to a path on the same origin. PASS (safe).
- **Assessment:** The open redirect protection is **correctly implemented** for all common bypass vectors.

### [PASS] P2. AuthGate uses `getUser()` for primary auth verification

- **File:** `components/auth/AuthGate.tsx:95`
- **Code:** `const { data: { user }, error: userError } = await supabase.auth.getUser();`
- **Assessment:** The primary auth gate correctly uses `getUser()` which validates the JWT server-side with Supabase. The subsequent `getSession()` call (line 106) is only used for expiry tracking, not for auth decisions. The periodic health check (line 194) also uses `getUser()`. This is the correct pattern.

### [PASS] P3. API routes use Bearer token + `getUser()` pattern

- **Files:** All files in `app/api/` (ai/coach, ai/conversations, billing/checkout, billing/portal, account/delete, macro/*, analyst/*)
- **Assessment:** Server-side API routes consistently extract the Bearer token from the Authorization header, create a per-request Supabase client via `createSupabaseClientForUser(token)`, and call `getUser()` to verify the JWT. This is the correct server-side auth pattern.

### [PASS] P4. Service role client properly isolated

- **File:** `lib/supabase/service.ts`
- **Assessment:** The service role client is in a separate file, checks for `SUPABASE_SERVICE_ROLE_KEY` env var, disables session persistence and auto-refresh. It is never imported from client components. The comment warns "SERVER-ONLY."

### [PASS] P5. Env validation prevents misconfiguration

- **File:** `lib/supabase/env.ts`
- **Assessment:** Comprehensive validation of `NEXT_PUBLIC_SUPABASE_URL` (must be valid URL) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (min 20 chars). Throws typed `SupabaseConfigError` with safe messages (no secret leakage). Good defensive coding.

---

## `getSession()` vs `getUser()` Usage Map

| Location | Method | Purpose | Risk |
|----------|--------|---------|------|
| `AuthGate.tsx:95` | `getUser()` | Primary auth check | SAFE |
| `AuthGate.tsx:106` | `getSession()` | Expiry tracking only | SAFE (after getUser) |
| `AuthGate.tsx:194` | `getUser()` | Periodic health check | SAFE |
| `AuthGate.tsx:199` | `getSession()` | Refresh check | SAFE (after getUser) |
| `onboarding/page.tsx:84` | `getSession()` | Auth gate check | RISK - should use getUser() |
| `onboarding/page.tsx:148,180` | `getSession()` | Extract access_token | ACCEPTABLE |
| `auth/callback/page.tsx:30,35` | `getSession()` | Post-auth session read | ACCEPTABLE (just authenticated) |
| `account/page.tsx:20` | `getSession()` | Get email for display | LOW RISK (behind AuthGate) |
| All other client components | `getSession()` | Extract access_token for API calls | ACCEPTABLE (API validates) |
| All API routes | `getUser()` | Server-side JWT validation | SAFE |

---

## CSRF Protection Assessment

- **Auth endpoints:** Supabase handles CSRF internally for its auth endpoints (signIn, signUp, signInWithOAuth). The OAuth flow uses PKCE (code exchange) which is CSRF-resistant.
- **API routes:** Use Bearer token authentication (Authorization header), which is inherently CSRF-resistant since browsers don't auto-attach custom headers.
- **Form submissions:** The onboarding name save goes through Supabase client directly (not a form POST to an API), so CSRF is handled by the Supabase session.
- **Assessment:** CSRF protection is **adequate** for the current architecture.

---

## Refresh Token Rotation Assessment

- Supabase JS v2 handles refresh token rotation automatically when `autoRefreshToken` is enabled (default). The AuthGate proactively calls `refreshSession()` when the token is within 5 minutes of expiry (line 117). The periodic check (every 5 min, line 186) also triggers refresh.
- **Assessment:** Refresh token handling is **correctly implemented** with proactive refresh before expiry.

---

## Token Storage Assessment

- **Current:** Tokens stored in localStorage via Supabase JS default behavior (`sb-*` keys).
- **Risk:** Vulnerable to XSS. Any JavaScript executing on the page can read the tokens.
- **Mitigating factors:** (a) No known XSS vectors in the app, (b) CSP headers would limit injection, (c) Supabase tokens have limited lifetime.
- **Recommendation:** For a financial app, migrating to `@supabase/ssr` with HttpOnly cookies would be the gold standard. This is a Large effort but should be on the roadmap.

---

## Priority Fix Order

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1 | V1: Remove `signOut()` from account page | Small | Prevents user-facing freeze bug |
| 2 | V2: Fix `router.replace()` in login page | Small | Prevents auth redirect loops |
| 3 | V5: Fix `.single()` in conversations API | Small | Prevents 500 errors |
| 4 | S1: Use `getUser()` in onboarding gate | Small | Hardens auth check |
| 5 | V3: Fix `router.replace()` in AI coach | Small | Rule compliance |
| 6 | V4: Fix `router.replace()` in reports | Small | Rule compliance |
| 7 | S3: Reduce inactivity timeout | Medium | Financial app best practice |
| 8 | S2: Implement server-side middleware | Medium | Defense in depth |
| 9 | S4: Migrate to HttpOnly cookies | Large | XSS token protection |
