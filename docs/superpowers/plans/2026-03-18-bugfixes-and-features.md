# Bugfixes & Features — Session 2026-03-18

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 critical bugs (dashboard settings, cancel subscription, delete account, data isolation, journal loading loop) and implement 4 features (AI Coach paywall, Elite→Ultra rename, landing navbar dropdown, landing header auth-aware).

**Architecture:** Bug-first approach — fix data isolation and loading issues before adding features. Rename Elite→Ultra touches many files but is mechanical. AI Coach paywall uses existing PaywallGate pattern.

**Tech Stack:** Next.js 14, Supabase, Stripe, TypeScript, Tailwind CSS

---

## Task 1: Fix Journal/Reports Loading Loop

**Problem:** `hasData` condition on journal line 306 includes `!accountsLoading` which stays `true` during SPA navigation, causing infinite skeleton loading. Only full page refresh fixes it.

**Files:**
- Modify: `app/app/journal/page.tsx:306`
- Modify: `app/app/reports/page.tsx` (same pattern if present)

- [ ] **Step 1: Fix journal hasData condition**

In `app/app/journal/page.tsx` line 306, the `accountsLoading` check is redundant because line 428 already shows a dedicated loading state when `accountsLoading` is true. The issue is that during SPA navigation, `ActiveAccountContext.isLoading` can remain stale. Fix by removing the redundant check from `hasData` since the render guards at lines 428-445 already handle those states:

```typescript
// Line 306: BEFORE
const hasData = activeAccountId && !loadingTrades && !tradesError && !accountsLoading;

// Line 306: AFTER
const hasData = activeAccountId && !loadingTrades && !tradesError;
```

- [ ] **Step 2: Check reports page for same pattern**

Search `app/app/reports/page.tsx` for similar `accountsLoading` gating in render conditions and fix if present.

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add app/app/journal/page.tsx app/app/reports/page.tsx
git commit -m "fix: journal/reports loading loop during SPA navigation"
```

---

## Task 2: Fix Cancel Subscription Portal Loading

**Problem:** `openPortal` in settings calls `window.location.href = url` which navigates away. The `finally` block with `setPortalLoading(false)` may not execute reliably. Also, if the Stripe portal API fails (no subscription, config error), the error is only shown via `alert()`.

**Files:**
- Modify: `app/app/settings/page.tsx:119-145`

- [ ] **Step 1: Improve openPortal error handling**

Replace the `openPortal` callback at lines 119-145. Key changes:
- Clear loading state BEFORE redirect (since redirect may not return to finally)
- Better error message for "No subscription found" case
- Show inline error message instead of alert

```typescript
const openPortal = useCallback(async () => {
  setPortalLoading(true);
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão expirada");

    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();
    if (!res.ok || !json.url) {
      throw new Error(json.error === "No subscription found"
        ? "Nenhuma assinatura encontrada para gerenciar."
        : json.error ?? "Erro ao abrir portal de pagamentos");
    }
    // Clear loading BEFORE redirect
    setPortalLoading(false);
    window.location.href = json.url;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao abrir portal";
    setSaveMsg({ type: "error", text: msg });
    setPortalLoading(false);
  }
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add app/app/settings/page.tsx
git commit -m "fix: cancel subscription portal loading state and error handling"
```

---

## Task 3: Implement Delete Account

**Problem:** Delete account button shows `alert("Funcionalidade em desenvolvimento.")` — not implemented.

**Files:**
- Create: `app/api/account/delete/route.ts`
- Modify: `app/app/settings/page.tsx:565-577`

- [ ] **Step 1: Create delete account API route**

Create `app/api/account/delete/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

    const userId = user.id;

    // 1. Cancel Stripe subscription if exists
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
      } catch (err) {
        console.error("[account/delete] Stripe cancel error:", err);
        // Continue even if Stripe cancel fails
      }
    }

    // 2. Delete user data from all tables (order matters for FK constraints)
    const tables = [
      "ai_usage",
      "journal_trades",
      "prop_accounts",
      "prop_payouts",
      "prop_alerts",
      "wallet_transactions",
      "tv_alerts",
      "ingestion_logs",
      "accounts",
      "subscriptions",
      "profiles",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) console.error(`[account/delete] Failed to delete from ${table}:`, error.message);
    }

    // 3. Delete auth user (requires service role)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("[account/delete] Auth delete error:", authError.message);
      return NextResponse.json({ ok: false, error: "Erro ao excluir conta de autenticação" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[account/delete] Error:", err);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Wire up delete button in settings page**

Replace the TODO onClick at line 569-577 in `app/app/settings/page.tsx`:

```typescript
onClick={async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao excluir conta");

    // Clear local state and redirect
    localStorage.clear();
    window.location.href = "/";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao excluir conta";
    alert(msg);
  }
}}
```

- [ ] **Step 3: Add loading state to delete button**

Add a `deleting` state and show spinner on the delete button while the API call is in progress. Disable both Cancel and Delete buttons during deletion.

- [ ] **Step 4: Commit**

```bash
git add app/api/account/delete/route.ts app/app/settings/page.tsx
git commit -m "feat: implement account deletion with Stripe cancel and data cleanup"
```

---

## Task 4: Data Isolation — Account Ownership Validation

**Problem:** Several server-side queries accept `account_id` from client without verifying it belongs to the authenticated user. `prop_accounts` queries also miss `user_id` filter.

**Files:**
- Create: `lib/account-validation.ts`
- Modify: `app/api/ai/coach/route.ts`
- Modify: `app/api/journal/import-mt5/route.ts`
- Modify: `lib/bootstrap/ensureDefaultAccounts.ts`

- [ ] **Step 1: Create account ownership validation helper**

Create `lib/account-validation.ts`:

```typescript
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Validates that an account belongs to the given user.
 * Returns the account row if valid, null otherwise.
 */
export async function validateAccountOwnership(
  supabase: SupabaseClient,
  accountId: string,
  userId: string,
): Promise<{ id: string; name: string; kind: string } | null> {
  const { data } = await supabase
    .from("accounts")
    .select("id, name, kind")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
```

- [ ] **Step 2: Add validation to AI Coach API route**

In `app/api/ai/coach/route.ts`, after extracting `body.account_id` and `userId`, add ownership check BEFORE quota increment:

```typescript
import { validateAccountOwnership } from "@/lib/account-validation";

// After getting userId and body.account_id:
const ownedAccount = await validateAccountOwnership(supabase, body.account_id, userId);
if (!ownedAccount) {
  return NextResponse.json({ ok: false, error: "Account not found" }, { status: 403 });
}
```

- [ ] **Step 3: Fix prop_accounts query in import-mt5**

In `app/api/journal/import-mt5/route.ts`, add `.eq("user_id", userId)` to the prop_accounts query (around line 156):

```typescript
// BEFORE
const { data: propRow } = await supabase
  .from("prop_accounts")
  .select("id, firm_name")
  .eq("account_id", accountId)
  .maybeSingle();

// AFTER — join through accounts table to verify ownership
const { data: propRow } = await supabase
  .from("prop_accounts")
  .select("id, firm_name, accounts!inner(user_id)")
  .eq("account_id", accountId)
  .eq("accounts.user_id", userId)
  .maybeSingle();
```

- [ ] **Step 4: Fix bootstrap prop_accounts query**

In `lib/bootstrap/ensureDefaultAccounts.ts`, add user_id filter to the prop_accounts dedup query (around line 62):

```typescript
// Add accounts join to ensure we only see this user's prop_accounts
const { data: propRows } = await supabase
  .from("prop_accounts")
  .select("account_id, accounts!inner(user_id)")
  .in("account_id", Array.from(propAccountIds))
  .eq("accounts.user_id", userId);
```

- [ ] **Step 5: Commit**

```bash
git add lib/account-validation.ts app/api/ai/coach/route.ts app/api/journal/import-mt5/route.ts lib/bootstrap/ensureDefaultAccounts.ts
git commit -m "fix: add account ownership validation to prevent cross-user data access"
```

---

## Task 5: Rename Elite → Ultra (Codebase-Wide)

**Problem:** User wants tier "Elite" renamed to "Ultra" with purple badge color.

**Files to modify (all "elite" → "ultra" renames):**
- `lib/subscription-shared.ts` — Plan type, TIER_LIMITS key, isElite→isUltra
- `lib/subscription.ts` — re-export rename
- `lib/stripe.ts` — PRICE_IDS keys, planFromPriceId return type
- `components/context/SubscriptionContext.tsx` — isElite→isUltra
- `components/billing/SubscriptionBadge.tsx` — key + color amber→purple
- `components/billing/PaywallGate.tsx` — requiredPlan type + labels
- `components/billing/PricingCards.tsx` — id + name
- `components/landing/LandingPricing.tsx` — id + name
- `app/api/billing/checkout/route.ts` — PlanInterval type
- `app/app/subscription/success/page.tsx` — display text
- `.env.local` — STRIPE_ELITE_* → STRIPE_ULTRA_* (env var names only, values stay same)

- [ ] **Step 1: Update subscription-shared.ts**

```typescript
// Plan type
export type Plan = "free" | "pro" | "ultra";

// TIER_LIMITS key: elite → ultra
ultra: { ... }

// Rename function
export function isUltra(plan: Plan): boolean {
  return plan === "ultra";
}

// Update isProOrAbove
export function isProOrAbove(plan: Plan): boolean {
  return plan === "pro" || plan === "ultra";
}
```

- [ ] **Step 2: Update lib/subscription.ts re-exports**

```typescript
export { getTierLimits, isProOrAbove, isUltra } from "./subscription-shared";
```

- [ ] **Step 3: Update lib/stripe.ts**

```typescript
// PRICE_IDS
ultra_monthly: process.env.STRIPE_ULTRA_MONTHLY_PRICE_ID!,
ultra_annual: process.env.STRIPE_ULTRA_ANNUAL_PRICE_ID!,

// planFromPriceId return type and logic
export function planFromPriceId(priceId: string): "pro" | "ultra" | null {
  if (priceId === PRICE_IDS.ultra_monthly || priceId === PRICE_IDS.ultra_annual) return "ultra";
  ...
}
```

- [ ] **Step 4: Update SubscriptionContext.tsx**

```typescript
import { isUltra } from "@/lib/subscription";
// isElite → isUltra in interface, value computation, and default
```

- [ ] **Step 5: Update SubscriptionBadge.tsx — purple color**

```typescript
const PLAN_STYLES = {
  free: "bg-zinc-500/10 text-zinc-500",
  pro: "bg-blue-500/10 text-blue-500",
  ultra: "bg-purple-500/10 text-purple-500",
};

const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  ultra: "Ultra",
};
```

- [ ] **Step 6: Update PaywallGate.tsx**

```typescript
requiredPlan: "pro" | "ultra";
const label = requiredPlan === "pro" ? "Pro" : "Ultra";
// hasAccess logic: "elite" → "ultra"
```

- [ ] **Step 7: Update PricingCards.tsx and LandingPricing.tsx**

Change `id: "elite"` → `id: "ultra"` and `name: "Elite"` → `name: "Ultra"` in both files.

- [ ] **Step 8: Update checkout route.ts**

```typescript
type PlanInterval = "pro_monthly" | "pro_annual" | "ultra_monthly" | "ultra_annual";
```

- [ ] **Step 9: Update subscription success page**

```typescript
Seu plano {plan === "ultra" ? "Ultra" : "Pro"} está ativo.
```

- [ ] **Step 10: Update .env.local variable names**

```
STRIPE_ULTRA_MONTHLY_PRICE_ID=price_1TBnsOGy803odeqT9WEDDjSs
STRIPE_ULTRA_ANNUAL_PRICE_ID=price_1TBnsOGy803odeqTBxU1NS6k
```

- [ ] **Step 11: Verify build**

Run: `npm run build`

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: rename Elite tier to Ultra with purple badge"
```

---

## Task 6: AI Coach Paywall for Free Users

**Problem:** AI Coach is fully accessible to free users (just with 1/month quota). Should show blurred/locked for free tier.

**Files:**
- Modify: `app/app/ai-coach/page.tsx`

- [ ] **Step 1: Wrap AI Coach content with PaywallGate**

In `app/app/ai-coach/page.tsx`, wrap the main content area with `PaywallGate`:

```typescript
import { PaywallGate } from "@/components/billing/PaywallGate";

// Wrap the entire AI Coach card/content with:
<PaywallGate requiredPlan="pro" blurContent>
  {/* existing AI Coach content */}
</PaywallGate>
```

The page title and description should remain visible outside the gate. Only the chat interface and analysis tools should be gated.

- [ ] **Step 2: Remove free-tier quota logic**

Since free users can't access anymore, the quota exhaustion UI only applies to pro/ultra. The existing quota system stays but free users never reach it.

- [ ] **Step 3: Commit**

```bash
git add app/app/ai-coach/page.tsx
git commit -m "feat: gate AI Coach behind Pro paywall with blur effect"
```

---

## Task 7: Landing Navbar — Functional User Dropdown

**Problem:** User reports the pill on the landing page navbar appears "just visual" when logged in. Investigation shows it already has a dropdown with Settings/Logout. May be a z-index or click handler issue.

**Files:**
- Modify: `components/landing/Navbar.tsx`

- [ ] **Step 1: Investigate and fix dropdown**

Read the full Navbar.tsx and verify:
1. The dropdown button has proper `onClick` handler
2. z-index of dropdown is high enough (above other landing page elements)
3. The outside-click handler isn't immediately closing the dropdown
4. The dropdown renders conditionally on state

Fix any issues found. Common fixes:
- Add `z-50` to dropdown container
- Ensure `stopPropagation` on button click
- Verify `showDropdown` state toggles correctly

- [ ] **Step 2: Ensure landing header keeps same tabs for logged-in/logged-out**

Verify that the navigation links (Plataforma, Recursos, Para Mesas, Preço) remain the same regardless of auth state. Only additions for logged-in: user pill + Dashboard button.

- [ ] **Step 3: Commit**

```bash
git add components/landing/Navbar.tsx
git commit -m "fix: landing navbar user dropdown z-index and interaction"
```

---

## Task 8: Dashboard Settings — Ensure Save Works After Migration

**Problem:** The `dashboard_layout` column didn't exist in DB (confirmed). User is running the migration. Code already has localStorage fallback. Need to verify it works end-to-end after migration.

**Files:**
- Modify: `app/app/settings/page.tsx` (if needed)
- Modify: `app/app/page.tsx` (dashboard load)

- [ ] **Step 1: Verify dashboard_layout column exists after migration**

Query Supabase via PostgREST to confirm column exists. If not, remind user to run the ALTER TABLE.

- [ ] **Step 2: Verify dashboard page loads layout from DB**

Check `app/app/page.tsx` to ensure it reads `dashboard_layout` from profile and falls back to localStorage, matching the settings page pattern.

- [ ] **Step 3: Test save/load cycle**

1. Go to Settings → Dashboard section
2. Toggle a widget visibility
3. Click Save
4. Reload page
5. Verify the change persisted

- [ ] **Step 4: Commit (if changes needed)**

```bash
git add app/app/settings/page.tsx app/app/page.tsx
git commit -m "fix: dashboard layout save/load with DB and localStorage fallback"
```

---

## Task 9: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

- [ ] **Step 2: Push to deploy**

```bash
git push origin main
```
