# Security Audit: Infrastructure, Secrets & Headers

**Date:** 2026-03-28
**Auditor:** Security Auditor Agent (Claude Opus 4.6)
**Scope:** Configuration, secrets management, security headers, dependencies, Sentry, source maps

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH     | 3 |
| MEDIUM   | 3 |
| LOW      | 2 |
| INFO     | 2 |

The application has solid fundamentals (timing-safe auth, source map hiding, proper .gitignore, no server secrets in client code). The most urgent issues are a **missing Content-Security-Policy header** and **puppeteer as a production dependency** inflating the attack surface.

---

## FINDINGS

### [CRITICAL] F1 — Missing Content-Security-Policy (CSP) Header

- **File:** `next.config.mjs:11-25`
- **Description:** No `Content-Security-Policy` header is configured. CSP is the primary defense against XSS, clickjacking via inline scripts, and data exfiltration. The app uses `dangerouslySetInnerHTML` in `app/layout.tsx:54` for a theme-detection script, which makes a nonce-based CSP necessary.
- **Impact:** Without CSP, any XSS vulnerability can execute arbitrary scripts, exfiltrate data to attacker-controlled domains, and load malicious resources. This is a financial application handling trading data.
- **Fix:** Add a strict CSP header with nonce support for the inline theme script. Minimum viable policy:
  ```
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://*.sentry.io https://api.stripe.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  ```
- **Effort:** Medium (requires Next.js middleware to generate per-request nonce)

---

### [HIGH] F2 — Puppeteer in Production Dependencies

- **File:** `package.json:32` — `"puppeteer": "^24.40.0"`
- **Description:** Puppeteer is listed under `dependencies` (not `devDependencies`) but is only used in local scripts (`scripts/screenshot-*.js`, `posts/*/export.js`). Puppeteer downloads a full Chromium binary (~280MB), massively increasing the deployment bundle and attack surface.
- **Impact:** Increases Vercel deployment size, adds a browser engine to the attack surface, potential for RCE if any code path accidentally invokes it server-side.
- **Fix:** Move `puppeteer` to `devDependencies`. It is not imported by any `app/` or `lib/` code.
- **Effort:** Small

---

### [HIGH] F3 — Alpha Vantage Fallback to "demo" API Key

- **File:** `lib/analyst/tools/finance/alpha-vantage.ts:3`
- **Description:** `const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo";` — Falls back to the public "demo" key if the env var is missing. The "demo" key is rate-limited (5 calls/min) and could silently serve stale/limited data without alerting operators.
- **Impact:** Silent degradation of financial data quality. In a trading dashboard, stale or demo data used for decisions is a material risk.
- **Fix:** Throw an error or return null with a logged warning instead of silently falling back to "demo". Same pattern as `lib/stripe.ts` which correctly throws when `STRIPE_SECRET_KEY` is missing.
- **Effort:** Small

---

### [HIGH] F4 — Sentry Client Missing PII Scrubbing Configuration

- **File:** `sentry.client.config.ts:3-9`
- **Description:** Sentry client config does not set `sendDefaultPii: false` (it defaults to false, but should be explicit for a financial app). More importantly, there is no `beforeSend` hook to scrub sensitive data (trade amounts, account IDs, user emails) from error reports before they leave the browser.
- **Impact:** If Sentry captures errors from trading forms or API responses, PII and financial data could be stored in Sentry's cloud.
- **Fix:** Add explicit `sendDefaultPii: false` and a `beforeSend` callback that strips sensitive fields. Also add `denyUrls` for known third-party scripts.
- **Effort:** Small

---

### [MEDIUM] F5 — Deprecated X-XSS-Protection Header

- **File:** `next.config.mjs:19`
- **Description:** `X-XSS-Protection: 1; mode=block` is set. This header is deprecated and disabled in modern browsers (Chrome removed its XSS auditor in 2019). In some edge cases, it can actually introduce vulnerabilities.
- **Impact:** False sense of security. No actual protection provided.
- **Fix:** Remove `X-XSS-Protection` header entirely. Rely on CSP (F1) instead.
- **Effort:** Small

---

### [MEDIUM] F6 — Cron Endpoints Publicly Accessible Without Vercel IP Restriction

- **File:** `vercel.json:3-28`, `lib/macro/cron-auth.ts`
- **Description:** Six cron endpoints are defined. They are protected by `CRON_SECRET` with timing-safe comparison (good), but they are still publicly accessible HTTP endpoints. Anyone can send requests to `/api/cron/calendar-sync` etc. The auth is in application code, not at the infrastructure level.
- **Impact:** Brute-force attacks against the cron secret. Each failed attempt still executes some application code (header parsing, buffer allocation).
- **Fix:** Consider adding Vercel's `x-vercel-cron-signature` verification as a second factor, or add rate limiting to cron endpoints. Document that `CRON_SECRET` must be a high-entropy value (32+ chars).
- **Effort:** Small

---

### [MEDIUM] F7 — Finnhub API Key Defaults to Empty String

- **File:** `lib/analyst/tools/finance/finnhub.ts:3`
- **Description:** `const API_KEY = process.env.FINNHUB_API_KEY || "";` — Similar to F3 but with empty string fallback. Requests with empty API key will fail silently or return 401 errors without clear logging.
- **Impact:** Silent failure of market data fetching.
- **Fix:** Validate presence and throw/warn at initialization, not at request time.
- **Effort:** Small

---

### [LOW] F8 — No `Strict-Transport-Security` preload list submission

- **File:** `next.config.mjs:16`
- **Description:** HSTS header includes `preload` directive, which is correct, but the domain must be submitted to hstspreload.org to take effect. Without submission, the `preload` directive is just a hint.
- **Impact:** First-time visitors could still be subject to protocol downgrade attacks until they receive the HSTS header.
- **Fix:** Submit domain to https://hstspreload.org after verifying all subdomains support HTTPS.
- **Effort:** Small

---

### [LOW] F9 — Next.js 14.2.18 — Check for Patches

- **File:** `package.json:31`
- **Description:** Next.js 14.2.18 is the pinned version. Next.js 14.x has reached its maintenance window. CVE-2024-46982 (cache poisoning) and CVE-2024-51479 (SSRF in Server Actions) affected earlier 14.x versions but were patched by 14.2.18. However, staying on 14.x means no new security patches.
- **Impact:** Future vulnerabilities in Next.js 14 will not receive fixes.
- **Fix:** Plan migration to Next.js 15.x. Monitor Next.js security advisories.
- **Effort:** Large

---

### [INFO] F10 — `dangerouslySetInnerHTML` Usage is Safe

- **File:** `app/layout.tsx:54`
- **Description:** The only production `dangerouslySetInnerHTML` usage is in the root layout for a theme-detection inline script. The content is a **static string literal** (not user-controlled). It reads from `localStorage` and sets a CSS class. This is a standard pattern to prevent theme flash (FOUC).
- **Impact:** No XSS risk. The HTML content is hardcoded at build time.
- **Note:** Previous audit (2026-03-21) incorrectly stated "No `dangerouslySetInnerHTML` usage" (P9). This corrects the record.

---

### [INFO] F11 — `eval`/`Function` — No Risk in Application Code

- **File:** Only found in `wealth.Investing/.obsidian/plugins/obsidian-local-rest-api/main.js`
- **Description:** `eval` and `new Function` occurrences are exclusively in an Obsidian plugin (third-party, not part of the web application). No application source code uses these patterns.
- **Impact:** None. The Obsidian vault is not deployed.

---

## GREEN FLAGS (Properly Configured)

| # | Area | Detail |
|---|------|--------|
| G1 | Secret isolation | No server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, etc.) leak to client components. All 114 `"use client"` files checked. |
| G2 | Public env vars | Only 3 `NEXT_PUBLIC_` vars used: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SENTRY_DSN`. All are safe for browser exposure. |
| G3 | .gitignore | `.env*.local` properly excluded. `*.pem` excluded. `.vercel` excluded. |
| G4 | Source maps hidden | `hideSourceMaps: true` in Sentry config (`next.config.mjs:30`). `productionBrowserSourceMaps` not enabled. |
| G5 | Security headers | HSTS (1yr + preload), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy (geo/mic/cam denied). |
| G6 | Webhook auth | Stripe webhook uses `constructEvent` with signature verification. TradingView webhook uses `crypto.timingSafeEqual`. |
| G7 | Cron auth | Timing-safe comparison for `CRON_SECRET`. Fails-closed if secret not configured. |
| G8 | Supabase client arch | Browser uses anon key only. Server routes use Bearer token pattern. Service role key only in API routes. |
| G9 | No hardcoded secrets | No API keys, tokens, or credentials found in committed source code. |
| G10 | Sentry environments | Both server and edge configs set `environment: process.env.NODE_ENV` for proper environment separation. |
| G11 | Puppeteer isolation | Despite being in wrong dependency group (F2), puppeteer is not imported in any `app/` or `lib/` code. |

---

## PRIORITY REMEDIATION ORDER

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1 | F1 — Add CSP header | Medium | Blocks entire XSS attack class |
| 2 | F2 — Move puppeteer to devDependencies | Small | Reduces deploy size ~280MB, shrinks attack surface |
| 3 | F3 — Remove alpha-vantage "demo" fallback | Small | Prevents silent data degradation |
| 4 | F4 — Add Sentry PII scrubbing | Small | Protects financial data in error reports |
| 5 | F5 — Remove X-XSS-Protection | Small | Remove false sense of security |
| 6 | F6 — Harden cron endpoints | Small | Defense in depth |
| 7 | F7 — Fix Finnhub empty key fallback | Small | Prevent silent failures |
| 8 | F8 — Submit HSTS preload | Small | Complete HSTS protection |
| 9 | F9 — Plan Next.js 15 migration | Large | Future-proof security patches |
