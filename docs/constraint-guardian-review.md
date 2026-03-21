# Constraint Guardian Review — wealth.Investing Design

**Date:** 2026-03-16
**Reviewer role:** Non-functional constraint validation only

---

## 1. PERFORMANCE

### P-1 (HIGH) Drawdown calculation fetches ALL trades unbounded
`lib/prop-stats.ts` line 65-69 does `select("closed_at, net_pnl_usd").eq("account_id", accountId)` with **no limit, no pagination, no date filter**. For an active trader with 5,000+ trades, this pulls the entire history on every dashboard load.

**Planned drawdown alerts make this worse:** daily drawdown recalculates on page load or polling, hitting this same unbounded query repeatedly.

**Fix:** Create a Postgres function (`rpc`) that computes drawdown server-side, or at minimum add a materialized/cached running balance column. For daily drawdown, filter by `closed_at >= today` at the query level.

### P-2 (MEDIUM) AI Coach latency
Claude Haiku round-trip is 2-8 seconds. Injecting 90 days of trades as context will increase token count significantly. A user with 500 trades over 90 days could produce ~50K input tokens per request.

**Fix:** Pre-summarize trade data into aggregated stats (win rate, avg PnL, streaks) before sending to Claude. Cap context to ~20K tokens.

### P-3 (LOW) Dashboard page makes multiple sequential Supabase calls
`app/app/page.tsx` queries trades, accounts separately. Not critical at current scale but will compound with drawdown + subscription checks.

**Fix:** Use `Promise.all` for parallel fetches (already partially done, just verify).

---

## 2. SCALABILITY

### S-1 (HIGH) Supabase connection limits on free/pro tier
Supabase free tier: **60 connections**. Pro tier: **200 direct, 1500 pooled (PgBouncer)**.
Each Vercel serverless function invocation creates a new `createClient()` (see `lib/supabase/server.ts`). Under concurrent load (Stripe webhooks + AI Coach + normal traffic), connection exhaustion is possible.

**Fix:** Confirm Supabase project uses **connection pooling** (port 6543, not 5432). The current `getSupabaseConfig()` should point to the pooler URL. Verify this in env vars.

### S-2 (MEDIUM) Stripe webhook volume is fine
Stripe sends ~5-10 events per subscription lifecycle. Even at 1000 users, this is trivial. No concern here.

### S-3 (MEDIUM) AI API rate limits for Elite "unlimited"
Claude API rate limits on Haiku: typically 100K tokens/min on standard tier. One Elite user spamming requests won't hit this, but 50+ concurrent Elite users could.

**Fix:** Even for "unlimited" Elite, enforce a per-user rate limit of ~50 requests/day (not just monthly count). Use the `ai_usage` table with a `last_used_at` timestamp to throttle bursts.

---

## 3. RELIABILITY

### R-1 (CRITICAL) No Stripe webhook retry/idempotency design
Stripe retries failed webhooks for up to 72 hours. If the planned `/api/webhooks/stripe` endpoint doesn't implement idempotency (checking `event.id` against processed events), duplicate subscription updates will occur.

**Fix:** Store `stripe_event_id` in a processed_events table or add idempotency check before updating `subscriptions`. Use `event.type` + `event.id` dedup.

### R-2 (HIGH) No fallback when Claude API is down
If the Claude API is unreachable, the AI Coach endpoint will return 500 and users get a generic error. No queue, no retry.

**Fix:** Return a user-friendly message ("AI analysis temporarily unavailable, try again in a few minutes"). Do NOT retry automatically on serverless — it will burn function execution time. Log failures for monitoring.

### R-3 (HIGH) TradingView webhook uses anon key without RLS bypass
`app/api/webhooks/tradingview/route.ts` line 46 creates a Supabase client with `anon` key but **no user JWT**. This insert into `tv_alerts` only succeeds if RLS allows inserts with `user_id = ownerId` from an unauthenticated client. If RLS policy requires `auth.uid() = user_id`, this will silently fail.

**Fix:** Either use `service_role` key (server-side only, never exposed) for webhook ingestion, or confirm RLS policy on `tv_alerts` allows anon inserts with explicit `user_id`. Current code at line 46-55 is a reliability risk.

### R-4 (MEDIUM) Subscription state stale on client
`SubscriptionContext` will cache subscription tier client-side. If a Stripe webhook updates the DB (e.g., payment failed, subscription canceled), the client won't know until next page reload or session refresh.

**Fix:** Add a `revalidate` function to `useSubscription()` that re-fetches on focus or every 5 minutes. Or use Supabase Realtime subscription on the `subscriptions` table.

---

## 4. SECURITY & PRIVACY

### SEC-1 (CRITICAL) Stripe webhook signature verification is essential
The existing TradingView webhook uses a custom `x-webhook-secret` header. Stripe uses `Stripe-Signature` header with HMAC. The new Stripe webhook endpoint MUST use `stripe.webhooks.constructEvent()` with the webhook signing secret — never trust raw payload.

**Fix:** Use official Stripe SDK for webhook verification. Do not roll custom HMAC.

### SEC-2 (HIGH) AI Coach sends raw trade data to external API
Trade data (symbols, P&L, timestamps) will be sent to Anthropic's Claude API. This is financial PII.

**Fix:**
- Document in Terms of Service that AI features send anonymized trade data to third-party AI providers.
- Strip or hash account names before sending. Send aggregated stats, not individual trade rows.
- Consider: Claude API data is not used for training (per Anthropic policy), but users must be informed.

### SEC-3 (HIGH) RLS must be added to all 3 new tables
`subscriptions`, `prop_alerts`, `ai_usage` all contain user-specific data. Each needs:
```sql
CREATE POLICY "Users can only access own rows" ON [table]
  FOR ALL USING (auth.uid() = user_id);
```
**Fix:** Add RLS policies BEFORE any code ships. Without RLS, any authenticated user can read/modify other users' subscription status.

### SEC-4 (MEDIUM) Subscription tier validation must be server-side
Client-side `useSubscription()` for UI gating is fine, but API routes (especially AI Coach, import) MUST re-validate tier from the `subscriptions` table server-side. A user could bypass client checks.

**Fix:** In `/api/ai/coach`, query `subscriptions` table to verify tier before processing. Never trust client-sent tier claims.

---

## 5. MAINTAINABILITY

### M-1 (HIGH) Solo dev maintaining 4 complex subsystems
After this phase, the codebase will have: billing (Stripe), AI integration (Claude), trade parsing (MT5 HTML/XLSX), and a drawdown rule engine. Each has its own failure modes, API versioning, and edge cases.

**Fix:**
- Prioritize observability: structured logging with `[stripe]`, `[ai-coach]`, `[drawdown]` prefixes.
- Add error tracking (Sentry free tier integrates with Vercel).
- Write integration tests for Stripe webhook handler (mock events) and AI Coach (mock Claude responses).

### M-2 (MEDIUM) No database migration strategy
New tables (`subscriptions`, `prop_alerts`, `ai_usage`) and new columns (`drawdown_type` on `prop_accounts`) are mentioned but there's no migration tooling. Supabase Dashboard SQL editor is manual and error-prone.

**Fix:** Use Supabase CLI migrations (`supabase db diff`, `supabase migration new`) to version-control schema changes.

---

## 6. OPERATIONAL COST

### C-1 (HIGH) Claude API costs with "unlimited" Elite tier
At R$139.90/mo (~$28 USD), if an Elite user makes 100 AI requests/month with 50K input tokens each:
- Input: 100 x 50K = 5M tokens x $0.25/1M = $1.25
- Output: 100 x 2K = 200K tokens x $1.25/1M = $0.25
- **Total: ~$1.50/user/month** — acceptable.

But with pre-summarized context (recommended in P-2), costs drop to ~$0.30/user/month. **No red flag if P-2 fix is applied.**

### C-2 (LOW) Supabase costs
Pro tier ($25/mo) supports 500MB database, 250K auth MAUs, 50GB bandwidth. For a solo-dev SaaS with <1000 users in year 1, this is fine. Monitor `journal_trades` row count — at 100K+ rows, consider archiving old trades.

### C-3 (LOW) Vercel costs
Hobby plan is free. Pro ($20/mo) if needed for team features or analytics. Serverless function invocations from AI Coach + Stripe webhooks won't exceed free tier limits for early-stage.

---

## Summary: Blockers Before Implementation

| ID | Severity | Issue | Must fix before shipping? |
|----|----------|-------|--------------------------|
| R-1 | CRITICAL | Stripe webhook idempotency | YES |
| SEC-1 | CRITICAL | Stripe webhook signature verification | YES |
| SEC-3 | HIGH | RLS on new tables | YES |
| R-3 | HIGH | TradingView webhook anon key vs RLS | YES (existing bug) |
| P-1 | HIGH | Unbounded trade query for drawdown | YES (before drawdown feature) |
| SEC-2 | HIGH | Trade data privacy in AI Coach | YES (ToS + anonymization) |
| SEC-4 | MEDIUM | Server-side tier validation | YES |
| S-1 | HIGH | Verify Supabase connection pooling | YES (config check) |
| R-2 | HIGH | AI Coach error handling | Before AI launch |
| S-3 | MEDIUM | Elite rate limiting | Before AI launch |
| R-4 | MEDIUM | Stale subscription client state | Before billing launch |
| M-1 | HIGH | Observability/logging | Recommended |
| M-2 | MEDIUM | Migration tooling | Recommended |
| P-2 | MEDIUM | AI context size | Recommended |
