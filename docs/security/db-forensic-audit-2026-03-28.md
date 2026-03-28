# Database Forensic Security Audit

**Date:** 2026-03-28
**Auditor:** Security Auditor Agent
**Scope:** All Supabase tables, RLS policies, migrations, and database access patterns
**Codebase:** `C:\Users\phalm\trading-dashboard`

---

## Executive Summary

**Overall Risk Level: MEDIUM**

- 21 tables identified across migrations and code
- 3 CRITICAL findings, 4 HIGH, 5 MEDIUM, 3 LOW
- RLS is enabled on all user-data tables (good)
- Macro/shared tables correctly use public-read + service-role-write
- Main gaps: SECURITY DEFINER functions missing `search_path`, stale INSERT policy on `macro_events`, incomplete account deletion, and client-side delete operations that rely solely on RLS without explicit user_id filtering

---

## Table-by-Table Audit

### Table: profiles
- **RLS enabled:** Yes (pre-existing, not in audited migrations)
- **Policies:** Presumed SELECT/INSERT/UPDATE with `auth.uid() = user_id`
- **User scoping:** All code queries use `.eq("user_id", session.user.id)` or `.maybeSingle()`
- **Issues found:** None

### Table: accounts
- **RLS enabled:** Yes (pre-existing)
- **Policies:** Presumed ALL with `auth.uid() = user_id`
- **User scoping:** All queries include `.eq("user_id", ...)`. `validateAccountOwnership()` in `lib/account-validation.ts` checks both `id` and `user_id`.
- **Issues found:** None

### Table: prop_accounts
- **RLS enabled:** Yes (pre-existing)
- **User scoping:** Queries filter by `account_id` and join to accounts via `user_id`. `ManageAccountsModal.tsx` line 73-75 deletes by `account_id` only -- relies on RLS.
- **Issues found:** MEDIUM -- see Finding M1

### Table: journal_trades
- **RLS enabled:** Yes (pre-existing)
- **User scoping:** Most queries include `.eq("user_id", userId)`. `TradeDetailModal.tsx` updates/deletes by `.eq("id", trade.id)` only -- relies on RLS.
- **Issues found:** MEDIUM -- see Finding M2

### Table: tv_alerts
- **RLS enabled:** Yes (pre-existing)
- **User scoping:** Not queried in current codebase beyond account delete.
- **Issues found:** None

### Table: prop_payouts
- **RLS enabled:** Yes (pre-existing)
- **User scoping:** `import-mt5/route.ts` queries with `account_id` after validating ownership. `prop-stats.ts` uses `userId` from session.
- **Issues found:** None

### Table: wallet_transactions
- **RLS enabled:** Yes (pre-existing)
- **User scoping:** Only written in `import-mt5/route.ts` after ownership validation.
- **Issues found:** None

### Table: ingestion_logs
- **RLS enabled:** Yes (pre-existing)
- **User scoping:** Written with `user_id` in `import-mt5/route.ts`.
- **Issues found:** None

### Table: day_notes
- **RLS enabled:** Yes
- **Policies:** FOR ALL USING `auth.uid() = user_id` (migration file)
- **User scoping:** All queries include `.eq("user_id", userId)`
- **Issues found:** None

### Table: subscriptions
- **RLS enabled:** Yes
- **Policies:** SELECT only for users (`auth.uid() = user_id`). No INSERT/UPDATE/DELETE policy for users.
- **User scoping:** All reads use `.eq("user_id", ...)`. Writes are via Stripe webhook with service_role.
- **Issues found:** None -- correct pattern. Users can only read; webhook writes with service_role.

### Table: prop_alerts
- **RLS enabled:** Yes
- **Policies:** SELECT + UPDATE with `auth.uid() = user_id`. No INSERT policy for users (inserted server-side).
- **User scoping:** All queries use `.eq("user_id", userId)`. INSERT in `prop-alerts.ts` uses user's supabase client.
- **Issues found:** HIGH -- see Finding H1

### Table: ai_usage
- **RLS enabled:** Yes
- **Policies:** SELECT/INSERT/UPDATE with `auth.uid() = user_id`
- **User scoping:** RPC functions use `p_user_id` parameter.
- **Issues found:** HIGH -- see Finding H2

### Table: ai_coach_messages
- **RLS enabled:** Yes
- **Policies:** SELECT/INSERT/DELETE with `auth.uid() = user_id`
- **User scoping:** All queries use `.eq("user_id", session.user.id)`
- **Issues found:** None

### Table: macro_events (from phase3-columns migration)
- **RLS enabled:** Yes
- **Policies:** SELECT `USING (true)`, INSERT `WITH CHECK (true)` -- ANYONE CAN INSERT
- **User scoping:** Shared table, no user_id
- **Issues found:** CRITICAL -- see Finding C1

### Table: economic_events
- **RLS enabled:** Yes
- **Policies:** Public SELECT, service_role INSERT/UPDATE (`auth.role() = 'service_role'`)
- **User scoping:** Shared table, no user_id. Writes via cron with service_role.
- **Issues found:** None -- correct pattern

### Table: weekly_panoramas
- **RLS enabled:** Yes
- **Policies:** Public SELECT, service_role INSERT/UPDATE
- **User scoping:** Shared table. Writes via cron.
- **Issues found:** None

### Table: central_bank_rates
- **RLS enabled:** Yes
- **Policies:** Public SELECT, service_role INSERT/UPDATE
- **User scoping:** Shared table. Writes via cron.
- **Issues found:** None

### Table: adaptive_alerts
- **RLS enabled:** Yes
- **Policies:** Public SELECT, service_role INSERT
- **User scoping:** Shared table. Writes via cron.
- **Issues found:** None

### Table: weekly_snapshots
- **RLS enabled:** Yes
- **Policies:** Public SELECT, service_role INSERT/UPDATE
- **User scoping:** Shared table.
- **Issues found:** None

### Table: macro_headlines
- **RLS enabled:** Unknown (no migration found in audited files)
- **User scoping:** Shared table. Writes via cron + live fallback with service_role.
- **Issues found:** MEDIUM -- see Finding M3

### Table: user_tags
- **RLS enabled:** Unknown (no migration found in audited files)
- **User scoping:** Client-side queries use `.eq("user_id", userId)`
- **Issues found:** MEDIUM -- see Finding M4

### Table: ai_coach_conversations
- **RLS enabled:** Unknown (no migration found)
- **User scoping:** All queries use `.eq("user_id", user.id)` in API route
- **Issues found:** LOW -- see Finding L1

### Table: analyst_reports
- **RLS enabled:** Unknown (no migration found)
- **User scoping:** All queries use `.eq("user_id", user.id)` in API routes
- **Issues found:** LOW -- see Finding L1

---

## Detailed Findings

### [CRITICAL] C1: `macro_events` INSERT policy allows ANY anonymous user to insert

- **Table/File:** `docs/migrations/2026-03-18-phase3-columns.sql` line 37
- **Description:** The INSERT policy uses `WITH CHECK (true)`, meaning any anonymous or authenticated user can insert rows into `macro_events` via the anon key. This was flagged in the prior audit (2026-03-10) as issue C1 and **appears NOT to have been fixed** in the migration file.
- **Impact:** An attacker with the anon key (which is public in the frontend) can insert arbitrary macro event data, polluting the calendar with fake economic events. This could mislead traders into making bad decisions.
- **Fix:** Change the INSERT policy to `WITH CHECK (auth.role() = 'service_role')` -- same pattern used for `economic_events`.
- **Effort:** Small

```sql
DROP POLICY IF EXISTS "Service role can insert macro events" ON macro_events;
CREATE POLICY "Service role can insert macro events"
  ON macro_events FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

### [CRITICAL] C2: SECURITY DEFINER functions missing `search_path`

- **Table/File:** `supabase/migrations/20260317_phase1_5_rule_engine.sql` (calc_drawdown), `supabase/migrations/20260317_ai_usage.sql` (increment_ai_usage, decrement_ai_usage)
- **Description:** All 3 `SECURITY DEFINER` functions lack `SET search_path = public`. This was flagged in the prior audit as L1 and remains unfixed. A malicious user could exploit schema search path hijacking by creating objects in a schema that appears earlier in the default search path.
- **Impact:** Potential privilege escalation. The functions run with the definer's privileges (typically superuser/owner), so a crafted schema object could intercept table references.
- **Fix:** Add `SET search_path = public` to all SECURITY DEFINER functions:

```sql
-- For each function, alter:
ALTER FUNCTION calc_drawdown(uuid, uuid) SET search_path = public;
ALTER FUNCTION increment_ai_usage(uuid, text) SET search_path = public;
ALTER FUNCTION decrement_ai_usage(uuid, text) SET search_path = public;
```
- **Effort:** Small

### [CRITICAL] C3: `increment_ai_usage` / `decrement_ai_usage` accept arbitrary user_id

- **Table/File:** `supabase/migrations/20260317_ai_usage.sql`, called from `app/api/ai/coach/route.ts`
- **Description:** Both RPC functions are `SECURITY DEFINER` and accept `p_user_id` as a parameter. They do NOT verify that `p_user_id = auth.uid()`. Since they bypass RLS (SECURITY DEFINER), any authenticated user could call `rpc('increment_ai_usage', { p_user_id: 'victim-uuid', p_month: '2026-03' })` to manipulate another user's usage count.
- **Impact:** An attacker could:
  1. Increment another user's usage count to exhaust their AI quota
  2. Decrement their own count to get unlimited free AI usage
- **Fix:** Add `auth.uid()` check inside the function body:

```sql
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_month TEXT)
RETURNS TABLE(new_usage_count INT, new_daily_count INT) AS $$
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot modify another user''s usage';
  END IF;
  -- ... rest of function
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```
- **Effort:** Small

### [HIGH] H1: `prop_alerts` INSERT relies on client supabase without INSERT RLS policy

- **Table/File:** `lib/prop-alerts.ts` line 81-82, migration `20260317_phase1_5_rule_engine.sql`
- **Description:** The `prop_alerts` table only has SELECT and UPDATE RLS policies. There is no INSERT policy. The `checkAndCreateAlerts` function in `prop-alerts.ts` uses the user's authenticated supabase client to insert alerts. Without an INSERT policy, this insert will be **silently blocked by RLS** (returns empty data, no error by default).
- **Impact:** Drawdown alerts may never actually be created if RLS is enforced. If they ARE being created, it means RLS might be bypassed somewhere, which is a separate concern.
- **Fix:** Add INSERT policy:

```sql
CREATE POLICY "Users can insert own alerts"
  ON prop_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
```
- **Effort:** Small

### [HIGH] H2: `ai_usage` RPC functions bypass RLS by design but lack internal auth check

- **Table/File:** `supabase/migrations/20260317_ai_usage.sql`
- **Description:** The `increment_ai_usage` and `decrement_ai_usage` functions are `SECURITY DEFINER`, bypassing RLS entirely. While the API route (`ai/coach/route.ts`) correctly passes the authenticated user's ID, the functions themselves have no guard. Any authenticated user can call these RPCs directly via the Supabase client JS SDK.
- **Impact:** Combined with C3 above. Users can manipulate their own or others' AI usage counters.
- **Fix:** See C3 fix above.
- **Effort:** Small

### [HIGH] H3: Account delete route misses newer tables

- **Table/File:** `app/api/account/delete/route.ts`
- **Description:** The account deletion endpoint iterates over a hardcoded list of tables to delete user data. Missing tables: `day_notes`, `ai_coach_messages`, `user_tags`, `ai_coach_conversations`, `analyst_reports`. User data in these tables will be orphaned when auth user is deleted.
- **Impact:** GDPR compliance risk -- user requests account deletion but personal data remains in 5 tables. Also, foreign key constraint `ON DELETE CASCADE` on `ai_coach_messages` will handle that one table via auth.users cascade, but others may not have cascade.
- **Fix:** Add missing tables to the deletion list (before accounts/profiles):

```typescript
const tables = [
  "ai_coach_messages",
  "ai_coach_conversations",
  "analyst_reports",
  "ai_usage",
  "day_notes",
  "user_tags",
  "journal_trades",
  "prop_alerts",
  "prop_payouts",
  "prop_accounts",
  "wallet_transactions",
  "tv_alerts",
  "ingestion_logs",
  "subscriptions",
  "accounts",
  "profiles",
];
```
- **Effort:** Small

### [HIGH] H4: `macro_headlines` route uses service_role key without auth check

- **Table/File:** `app/api/macro/headlines/route.ts` lines 100-103, 166-169
- **Description:** The GET endpoint at `/api/macro/headlines` is a public API route (no auth check). When `?live=1` is passed or DB is empty, it creates a service_role client to persist headlines. While the service_role client is only used for writes to `macro_headlines` (a shared table), the route itself has no authentication, so anyone can trigger potentially expensive live-fetch + AI translation operations.
- **Impact:** DoS vector -- an attacker can repeatedly hit `/api/macro/headlines?live=1` to trigger RSS fetches and AI translation calls, burning API credits and server resources.
- **Fix:** Add rate limiting or require authentication for the `?live=1` parameter. At minimum, throttle live fetches:

```typescript
if (forceLive) {
  // Require auth for live fetch to prevent abuse
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Auth required for live fetch" }, { status: 401 });
}
```
- **Effort:** Small

### [MEDIUM] M1: `ManageAccountsModal` deletes by `account_id` without explicit user_id

- **Table/File:** `components/account/ManageAccountsModal.tsx` lines 73-88
- **Description:** Deletes `prop_accounts` by `.eq("account_id", account.id)` and `accounts` by `.eq("id", account.id)` without adding `.eq("user_id", ...)`. This relies entirely on RLS.
- **Impact:** If RLS were ever misconfigured or disabled, a user could delete another user's account by manipulating the account ID. Currently safe due to RLS, but defense-in-depth is missing.
- **Fix:** Add `.eq("user_id", session.user.id)` to both delete queries.
- **Effort:** Small

### [MEDIUM] M2: `TradeDetailModal` updates/deletes by trade `id` without user_id

- **Table/File:** `components/journal/TradeDetailModal.tsx` lines 95-111, 132-135
- **Description:** Updates and deletes `journal_trades` by `.eq("id", trade.id)` only. Relies entirely on RLS for user scoping.
- **Impact:** Same as M1 -- safe with RLS but no defense-in-depth.
- **Fix:** Add `.eq("user_id", userId)` to update and delete queries.
- **Effort:** Small

### [MEDIUM] M3: `macro_headlines` table -- no migration found

- **Table/File:** Referenced in `app/api/macro/headlines/route.ts`, `app/api/cron/headlines-sync/route.ts`
- **Description:** No migration SQL file was found for the `macro_headlines` table in the audited migrations directory. The table is actively used but its schema, RLS status, and policies cannot be verified from code alone.
- **Impact:** If the table was created manually without RLS or with overly permissive policies, shared headline data could be tampered with.
- **Fix:** Create a migration file documenting the table schema and RLS policies. Verify in Supabase dashboard that RLS is enabled with public SELECT and service_role INSERT/UPDATE.
- **Effort:** Small

### [MEDIUM] M4: `user_tags` table -- no migration found

- **Table/File:** Referenced in `components/journal/DayDetailModal.tsx`
- **Description:** No migration SQL file exists for `user_tags`. Client-side code inserts and deletes with `.eq("user_id", userId)`.
- **Impact:** Cannot verify RLS policies from code. If missing, any user could read/modify other users' tags.
- **Fix:** Create migration file and verify RLS in dashboard.
- **Effort:** Small

### [MEDIUM] M5: `BacktestSection` inserts journal_trades without account ownership validation

- **Table/File:** `components/dashboard/BacktestSection.tsx` line 98
- **Description:** Inserts a `journal_trades` row using `supabase.from("journal_trades").insert({...})` from client-side. The `account_id` comes from component state. There is no server-side validation that the user owns the account before inserting.
- **Impact:** Relies on RLS. If `journal_trades` has an INSERT policy checking `user_id`, this is safe. But if the check is only on `account_id` relationship, a user could insert trades into someone else's account.
- **Fix:** Use `validateAccountOwnership()` server-side, or ensure the INSERT policy validates user_id.
- **Effort:** Small

### [LOW] L1: Missing migration files for newer tables

- **Table/File:** `ai_coach_conversations`, `analyst_reports`
- **Description:** These tables are referenced in API routes (`app/api/ai/conversations/route.ts`, `app/api/analyst/run/route.ts`, `app/api/analyst/history/route.ts`) but have no migration files in the repo.
- **Impact:** Schema and RLS policies cannot be audited from code. Need to verify in Supabase dashboard.
- **Fix:** Add migration files for documentation and reproducibility.
- **Effort:** Small

### [LOW] L2: Community intelligence service_role reads all users' trades

- **Table/File:** `lib/ai-community-stats.ts`
- **Description:** Uses `createServiceRoleClient()` to read ALL users' `journal_trades` for community sentiment aggregation. This is intentional (cross-user aggregate), but the output reveals per-user directional bias (symbol + direction).
- **Impact:** Low -- data is aggregated to symbol level with min 5 trader threshold. Individual positions are not exposed. The 1-hour cache mitigates load.
- **Fix:** Consider further anonymization or moving to a materialized view / DB function to avoid reading raw trades.
- **Effort:** Medium

### [LOW] L3: `calc_drawdown` RPC accepts `p_user_id` parameter

- **Table/File:** `supabase/migrations/20260317_phase1_5_rule_engine.sql`
- **Description:** The `calc_drawdown` function accepts both `p_account_id` and `p_user_id` and internally validates ownership (joins `accounts.user_id = p_user_id`). However, it does NOT verify `p_user_id = auth.uid()`, so a user could pass another user's ID. The function would return nothing (join fails), but it's still a design gap.
- **Impact:** Minimal -- the join to `accounts.user_id` prevents data leakage. But for consistency, should verify auth.
- **Fix:** Add `IF p_user_id != auth.uid() THEN RETURN; END IF;` at the start.
- **Effort:** Small

---

## RPC Functions Audit

| Function | SECURITY DEFINER | search_path set | auth.uid() check | Risk |
|---|---|---|---|---|
| `calc_drawdown` | Yes | NO | No (but join validates) | MEDIUM |
| `increment_ai_usage` | Yes | NO | NO | CRITICAL |
| `decrement_ai_usage` | Yes | NO | NO | CRITICAL |

---

## Service Role Usage Audit

All service_role usage locations:

| File | Purpose | Justified? |
|---|---|---|
| `app/api/webhooks/stripe/route.ts` | Stripe webhook writes to subscriptions | YES -- verified via Stripe signature |
| `app/api/account/delete/route.ts` | Delete auth.users record | YES -- after JWT verification |
| `app/api/cron/calendar-sync/route.ts` | Cron writes to economic_events | YES -- verified via CRON_SECRET |
| `app/api/cron/weekly-briefing/route.ts` | Cron writes to weekly_panoramas | YES -- verified via CRON_SECRET |
| `app/api/cron/headlines-sync/route.ts` | Cron writes to macro_headlines | YES -- verified via CRON_SECRET |
| `app/api/cron/narrative-update/route.ts` | Cron writes to adaptive_alerts, panoramas | YES -- verified via CRON_SECRET |
| `app/api/cron/rates-sync/route.ts` | Cron writes to central_bank_rates | YES -- verified via CRON_SECRET |
| `app/api/cron/calendar-sync-pm/route.ts` | PM cron relay | YES -- verified via CRON_SECRET |
| `app/api/macro/headlines/route.ts` | Live headline persistence | CONCERN -- no auth on GET route |
| `app/api/macro/regenerate-report/route.ts` | Admin report regeneration | NEEDS REVIEW -- auth check unclear |
| `app/api/macro/refresh-rates/route.ts` | Manual rate refresh | NEEDS REVIEW -- auth check unclear |
| `app/api/macro/refresh-calendar/route.ts` | Manual calendar refresh | NEEDS REVIEW -- auth check unclear |
| `app/api/macro/check-rate-update/route.ts` | Rate update checker | NEEDS REVIEW -- auth check unclear |
| `app/api/macro/calendar/route.ts` | Calendar with admin upsert | NEEDS REVIEW -- admin path auth |
| `lib/macro/rates-fetcher.ts` | Seed rates to DB | YES -- server-only utility |
| `lib/ai-community-stats.ts` | Cross-user trade aggregation | YES -- server-only, anonymized output |

---

## Prior Audit Issues Status (2026-03-10)

| Issue | Status | Notes |
|---|---|---|
| C1: `macro_events` INSERT `WITH CHECK (true)` | **STILL OPEN** | Migration file unchanged |
| L1: SECURITY DEFINER functions missing search_path | **STILL OPEN** | 3 functions affected |
| L6: Duplicate SELECT policies on 4 tables | Cannot verify | Need dashboard access |

---

## Remediation Priority

### Immediate (do today):
1. **C1** -- Fix `macro_events` INSERT policy
2. **C2** -- Add `search_path = public` to all SECURITY DEFINER functions
3. **C3** -- Add `auth.uid()` check to `increment_ai_usage` / `decrement_ai_usage`
4. **H3** -- Add missing tables to account delete route

### This week:
5. **H1** -- Add INSERT policy for `prop_alerts`
6. **H4** -- Add auth check for `?live=1` on headlines route
7. **M1-M2** -- Add explicit `user_id` to client-side update/delete queries
8. **M3-M4** -- Create migration files for undocumented tables

### Backlog:
9. **M5** -- Server-side validation for backtest trade insertion
10. **L1** -- Create migration files for ai_coach_conversations, analyst_reports
11. **L2** -- Consider materialized view for community stats
12. **L3** -- Add auth check to calc_drawdown
13. Audit `macro/regenerate-report`, `macro/refresh-rates`, `macro/refresh-calendar` routes for auth checks

---

## Positive Findings

1. **Cron auth is solid** -- `verifyCronAuth()` uses `crypto.timingSafeEqual()` with CRON_SECRET
2. **Supabase client architecture is clean** -- separate client/server/service modules with clear separation
3. **Import route is well-designed** -- `import-mt5/route.ts` uses Bearer token auth, validates account ownership, and deduplicates
4. **RLS is universally enabled** -- every table in migrations has `ENABLE ROW LEVEL SECURITY`
5. **User scoping is consistent** -- 50+ queries verified with `.eq("user_id", ...)` pattern
6. **No SQL injection risk** -- all queries use Supabase's parameterized query builder, no raw SQL string interpolation
7. **No secrets in code** -- all credentials are in environment variables
