# Phase 1: Billing MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe billing (card + Pix), subscription tiers (Free/Pro/Elite), tier gating, pricing page, settings page, expanded onboarding, and Sentry error tracking to wealth.Investing.

**Architecture:** Stripe Hosted Checkout for payments, webhooks for subscription sync to Supabase `subscriptions` table with RLS. Client-side `SubscriptionContext` + `useSubscription()` hook for tier gating, `<PaywallGate>` component for feature access control. Server-side tier validation in API routes via `subscriptions` table lookup.

**Tech Stack:** Stripe SDK (stripe + @stripe/stripe-js), Next.js API routes, Supabase (Postgres + RLS), shadcn/ui, canvas-confetti, @number-flow/react, @sentry/nextjs

**Reference:** `docs/design-mvp-revenue.md` (APPROVED design doc)

---

## File Structure

### New Files
```
lib/stripe.ts                              — Stripe server client singleton
lib/subscription.ts                        — Subscription helpers (getTierLimits, checkTierAccess)
components/context/SubscriptionContext.tsx  — SubscriptionProvider + useSubscription hook
components/billing/PaywallGate.tsx          — Wrapper that blocks content behind tier
components/billing/PricingCards.tsx         — Pricing cards component (shadcn, 3 tiers, annual toggle, confetti)
components/billing/SubscriptionBadge.tsx    — Small badge showing current plan
app/app/pricing/page.tsx                   — Pricing page
app/app/settings/page.tsx                  — Settings page (profile, subscription, preferences, danger zone)
app/app/subscription/success/page.tsx      — Post-checkout success page
app/api/webhooks/stripe/route.ts           — Stripe webhook handler
app/api/billing/checkout/route.ts          — Creates Stripe Checkout session
app/api/billing/portal/route.ts            — Creates Stripe Customer Portal session
supabase/migrations/20260317_create_subscriptions.sql — subscriptions table + RLS
hooks/use-media-query.ts                   — Media query hook (for pricing responsive)
sentry.client.config.ts                    — Sentry client config
sentry.server.config.ts                    — Sentry server config
sentry.edge.config.ts                      — Sentry edge config
```

### Modified Files
```
.env.local                                 — Add STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID, STRIPE_ELITE_PRICE_ID, SENTRY_DSN
lib/supabase/env.ts                        — Add Stripe env validation
components/layout/AppShell.tsx             — Wrap with SubscriptionProvider
components/layout/AppHeader.tsx            — Add Settings + Pricing nav links
app/onboarding/page.tsx                    — Expand to 4 steps (trader type, accounts, first import)
app/app/journal/page.tsx                   — Add PaywallGate for Pro+ features
next.config.js                             — Add Sentry webpack plugin config
package.json                               — Add stripe, @stripe/stripe-js, canvas-confetti, @number-flow/react, @sentry/nextjs
```

---

## Chunk 1: Database + Stripe Backend

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Stripe + billing dependencies**

```bash
npm install stripe @stripe/stripe-js canvas-confetti @number-flow/react
npm install -D @types/canvas-confetti
```

- [ ] **Step 2: Install Sentry**

```bash
npx @sentry/wizard@latest -i nextjs
```

If wizard fails or is interactive, install manually:
```bash
npm install @sentry/nextjs
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add stripe, confetti, number-flow, sentry deps"
```

---

### Task 2: Subscriptions table + RLS

**Files:**
- Create: `supabase/migrations/20260317_create_subscriptions.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- Subscriptions table for billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_event_id TEXT,
  plan TEXT CHECK (plan IN ('free', 'pro', 'elite')) DEFAULT 'free' NOT NULL,
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')) DEFAULT 'active' NOT NULL,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Index for webhook lookups
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_event ON subscriptions(stripe_event_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
```

- [ ] **Step 2: Run migration on Supabase**

Apply via Supabase Dashboard SQL editor or `supabase db push`. Verify table exists with correct columns and RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260317_create_subscriptions.sql
git commit -m "feat: add subscriptions table with RLS"
```

---

### Task 3: Stripe server client + env validation

**Files:**
- Create: `lib/stripe.ts`
- Modify: `lib/supabase/env.ts`
- Modify: `.env.local`

- [ ] **Step 1: Add env vars to `.env.local`**

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_ELITE_MONTHLY_PRICE_ID=price_...
STRIPE_ELITE_ANNUAL_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

> **Note:** Create Stripe products and prices in Stripe Dashboard first. Create 4 prices: Pro Monthly (R$79.90), Pro Annual (R$63.90/mo billed annually = R$766.80/yr), Elite Monthly (R$139.90), Elite Annual (R$111.90/mo = R$1342.80/yr). Currency: BRL.

- [ ] **Step 2: Create Stripe server client**

```typescript
// lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  elite_monthly: process.env.STRIPE_ELITE_MONTHLY_PRICE_ID!,
  elite_annual: process.env.STRIPE_ELITE_ANNUAL_PRICE_ID!,
} as const;

/** Map Stripe price ID → plan name */
export function planFromPriceId(priceId: string): "pro" | "elite" | null {
  if (priceId === PRICE_IDS.pro_monthly || priceId === PRICE_IDS.pro_annual) return "pro";
  if (priceId === PRICE_IDS.elite_monthly || priceId === PRICE_IDS.elite_annual) return "elite";
  return null;
}
```

- [ ] **Step 3: Add Stripe env validation to `lib/supabase/env.ts`**

Add a check that `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` exist when running server-side. Don't throw on client (these are server-only vars). Only validate in API routes that use Stripe.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/stripe.ts lib/supabase/env.ts
git commit -m "feat: stripe server client + env validation"
```

---

### Task 4: Stripe Checkout API route

**Files:**
- Create: `app/api/billing/checkout/route.ts`

- [ ] **Step 1: Create checkout session endpoint**

```typescript
// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

type PlanInterval = "pro_monthly" | "pro_annual" | "elite_monthly" | "elite_annual";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const planInterval = body.plan as PlanInterval;
    const priceId = PRICE_IDS[planInterval];
    if (!priceId) return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });

    // Check if user already has a Stripe customer
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card", "boleto"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/pricing`,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/checkout] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
```

> **Note:** Stripe BR may not support `pix` as payment method type in Checkout directly. Use `card` + `boleto`. If Pix is available in your Stripe account, add `"pix"` to `payment_method_types`. Check Stripe Dashboard → Settings → Payment methods. Research with context7 before implementing.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/billing/checkout/route.ts
git commit -m "feat: stripe checkout session API route"
```

---

### Task 5: Stripe Customer Portal API route

**Files:**
- Create: `app/api/billing/portal/route.ts`

- [ ] **Step 1: Create portal session endpoint**

```typescript
// app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ ok: false, error: "No subscription found" }, { status: 404 });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/app/settings`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[billing/portal] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
```

> **Note:** Configure Stripe Customer Portal in Dashboard → Settings → Billing → Customer portal. Enable: cancel subscription, switch plans, update payment method.

- [ ] **Step 2: Commit**

```bash
git add app/api/billing/portal/route.ts
git commit -m "feat: stripe customer portal API route"
```

---

### Task 6: Stripe Webhook handler

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create webhook handler with idempotency**

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role for webhook (no user context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) break;

        // Get subscription to find plan
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        const plan = planFromPriceId(priceId ?? "") ?? "pro";

        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_event_id: event.id,
          plan,
          status: "active",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        const priceId = sub.items.data[0]?.price.id;
        const plan = planFromPriceId(priceId ?? "");

        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          stripe_event_id: event.id,
          plan: plan ?? "free",
          status: sub.status === "active" ? "active"
            : sub.status === "past_due" ? "past_due"
            : sub.status === "canceled" ? "canceled"
            : sub.status === "trialing" ? "trialing"
            : "incomplete",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        await supabaseAdmin.from("subscriptions").update({
          plan: "free",
          status: "canceled",
          stripe_event_id: event.id,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] Processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat: stripe webhook with signature verification + idempotency"
```

---

## Chunk 2: Subscription Context + Tier Gating

### Task 7: Subscription helpers

**Files:**
- Create: `lib/subscription.ts`

- [ ] **Step 1: Create subscription types and helpers**

```typescript
// lib/subscription.ts
import { supabase } from "@/lib/supabase/client";

export type Plan = "free" | "pro" | "elite";
export type SubStatus = "active" | "canceled" | "past_due" | "trialing" | "incomplete";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: SubStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface TierLimits {
  maxTrades: number | null;      // null = unlimited
  maxAccounts: number | null;
  aiCoachMonthly: number;
  aiCoachDaily: number | null;   // null = use monthly
  hasExportCsv: boolean;
  hasCtrader: boolean;
  hasDashboardOverview: boolean;
  hasAccountComparison: boolean;
  hasCustomAlerts: boolean;
  hasPrioritySupport: boolean;
}

const TIER_LIMITS: Record<Plan, TierLimits> = {
  free: {
    maxTrades: 30,
    maxAccounts: 2,
    aiCoachMonthly: 1,
    aiCoachDaily: null,
    hasExportCsv: false,
    hasCtrader: false,
    hasDashboardOverview: false,
    hasAccountComparison: false,
    hasCustomAlerts: false,
    hasPrioritySupport: false,
  },
  pro: {
    maxTrades: null,
    maxAccounts: 5,
    aiCoachMonthly: 10,
    aiCoachDaily: null,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: false,
    hasCustomAlerts: false,
    hasPrioritySupport: false,
  },
  elite: {
    maxTrades: null,
    maxAccounts: null,
    aiCoachMonthly: 150,
    aiCoachDaily: 5,
    hasExportCsv: true,
    hasCtrader: true,
    hasDashboardOverview: true,
    hasAccountComparison: true,
    hasCustomAlerts: true,
    hasPrioritySupport: true,
  },
};

export function getTierLimits(plan: Plan): TierLimits {
  return TIER_LIMITS[plan];
}

export function isProOrAbove(plan: Plan): boolean {
  return plan === "pro" || plan === "elite";
}

export function isElite(plan: Plan): boolean {
  return plan === "elite";
}

export async function fetchMySubscription(): Promise<SubscriptionRow | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("[subscription] fetch error:", error.message);
    return null;
  }
  return data as SubscriptionRow | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/subscription.ts
git commit -m "feat: subscription types, tier limits, and helpers"
```

---

### Task 8: SubscriptionContext + useSubscription hook

**Files:**
- Create: `components/context/SubscriptionContext.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Create SubscriptionContext**

```typescript
// components/context/SubscriptionContext.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMySubscription, getTierLimits, isProOrAbove, isElite } from "@/lib/subscription";
import type { Plan, SubscriptionRow, TierLimits } from "@/lib/subscription";
import { supabase } from "@/lib/supabase/client";

interface SubscriptionContextValue {
  plan: Plan;
  status: string;
  subscription: SubscriptionRow | null;
  limits: TierLimits;
  isProOrAbove: boolean;
  isElite: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sub = await fetchMySubscription();
      setSubscription(sub);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session) await load();
      else setIsLoading(false);
    }

    init();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") load();
      else if (event === "SIGNED_OUT") {
        setSubscription(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      authSub.unsubscribe();
    };
  }, [load]);

  // Poll every 5 min to catch webhook updates
  useEffect(() => {
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const plan: Plan = (subscription?.status === "active" || subscription?.status === "trialing")
    ? (subscription?.plan ?? "free")
    : "free";

  const value = useMemo<SubscriptionContextValue>(() => ({
    plan,
    status: subscription?.status ?? "active",
    subscription,
    limits: getTierLimits(plan),
    isProOrAbove: isProOrAbove(plan),
    isElite: isElite(plan),
    isLoading,
    refreshSubscription: load,
  }), [plan, subscription, isLoading, load]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    return {
      plan: "free",
      status: "active",
      subscription: null,
      limits: getTierLimits("free"),
      isProOrAbove: false,
      isElite: false,
      isLoading: true,
      refreshSubscription: async () => {},
    };
  }
  return ctx;
}
```

- [ ] **Step 2: Wrap AppShell with SubscriptionProvider**

In `components/layout/AppShell.tsx`, add `SubscriptionProvider` inside `ActiveAccountProvider`:

```tsx
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";

// In the return:
<ActiveAccountProvider>
  <SubscriptionProvider>
    {!hideHeader && <AppHeader />}
    <main>{children}</main>
  </SubscriptionProvider>
</ActiveAccountProvider>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/context/SubscriptionContext.tsx components/layout/AppShell.tsx
git commit -m "feat: SubscriptionContext + useSubscription hook with auth sync"
```

---

### Task 9: PaywallGate component

**Files:**
- Create: `components/billing/PaywallGate.tsx`

- [ ] **Step 1: Create PaywallGate**

```typescript
// components/billing/PaywallGate.tsx
"use client";

import { useSubscription } from "@/components/context/SubscriptionContext";
import { Lock } from "lucide-react";
import Link from "next/link";
import type { Plan } from "@/lib/subscription";

interface PaywallGateProps {
  requiredPlan: "pro" | "elite";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  blurContent?: boolean;
}

function DefaultFallback({ requiredPlan }: { requiredPlan: "pro" | "elite" }) {
  const label = requiredPlan === "pro" ? "Pro" : "Elite";
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-border/60 px-6 py-12 text-center"
      style={{ backgroundColor: "hsl(var(--card))" }}>
      <Lock className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Recurso disponível no plano {label}</p>
      <Link
        href="/app/pricing"
        className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Ver planos
      </Link>
    </div>
  );
}

export function PaywallGate({ requiredPlan, children, fallback, blurContent = false }: PaywallGateProps) {
  const { plan, isLoading } = useSubscription();

  if (isLoading) return null;

  const hasAccess = requiredPlan === "pro"
    ? (plan === "pro" || plan === "elite")
    : plan === "elite";

  if (hasAccess) return <>{children}</>;

  if (blurContent) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback ?? <DefaultFallback requiredPlan={requiredPlan} />}
        </div>
      </div>
    );
  }

  return <>{fallback ?? <DefaultFallback requiredPlan={requiredPlan} />}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/billing/PaywallGate.tsx
git commit -m "feat: PaywallGate component with blur + fallback support"
```

---

### Task 10: SubscriptionBadge component

**Files:**
- Create: `components/billing/SubscriptionBadge.tsx`

- [ ] **Step 1: Create badge**

```typescript
// components/billing/SubscriptionBadge.tsx
"use client";

import { useSubscription } from "@/components/context/SubscriptionContext";
import { cn } from "@/lib/utils";

const PLAN_STYLES = {
  free: "bg-zinc-500/10 text-zinc-500",
  pro: "bg-blue-500/10 text-blue-500",
  elite: "bg-amber-500/10 text-amber-500",
} as const;

const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  elite: "Elite",
} as const;

export function SubscriptionBadge({ className }: { className?: string }) {
  const { plan } = useSubscription();
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", PLAN_STYLES[plan], className)}>
      {PLAN_LABELS[plan]}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/billing/SubscriptionBadge.tsx
git commit -m "feat: SubscriptionBadge component"
```

---

## Chunk 3: Pricing Page

### Task 11: Media query hook

**Files:**
- Create: `hooks/use-media-query.ts`

- [ ] **Step 1: Create hook**

```typescript
// hooks/use-media-query.ts
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-media-query.ts
git commit -m "feat: useMediaQuery hook"
```

---

### Task 12: PricingCards component

**Files:**
- Create: `components/billing/PricingCards.tsx`

- [ ] **Step 1: Create PricingCards**

Build a pricing component with these requirements:
- 3 cards: Free, Pro (R$79,90/mo), Elite (R$139,90/mo)
- Annual/Monthly toggle with 20% discount on annual
- Annual prices: Pro R$63,90/mo, Elite R$111,90/mo
- Confetti animation on annual toggle (canvas-confetti)
- Animated price transitions (@number-flow/react)
- Feature comparison list per tier (from design doc section 2)
- PT-BR labels, BRL currency
- "Plano atual" badge on current plan
- "Assinar" button → calls `/api/billing/checkout` and redirects to Stripe
- Responsive: stack on mobile, 3-col on desktop
- Uses shadcn Card, Button components
- Follow project conventions: `rounded-[22px]`, inline `style={{ backgroundColor }}`, Tailwind only

Reference the user-provided shadcn pricing component structure (session context). Adapt to BRL/PT-BR with wealth.Investing tier features from the pricing table in `docs/design-mvp-revenue.md` section 2.

The component should accept an optional `onCheckout` prop for handling the checkout flow, defaulting to calling the API route.

> **IMPORTANT:** Research `@number-flow/react` and `canvas-confetti` docs via context7 before implementing to ensure correct API usage.

- [ ] **Step 2: Verify it renders correctly**

```bash
npm run dev
# Navigate to where PricingCards is used and verify visually
```

- [ ] **Step 3: Commit**

```bash
git add components/billing/PricingCards.tsx
git commit -m "feat: PricingCards with annual toggle, confetti, animated prices"
```

---

### Task 13: Pricing page

**Files:**
- Create: `app/app/pricing/page.tsx`
- Modify: `components/layout/AppHeader.tsx` — add Pricing link to nav

- [ ] **Step 1: Create pricing page**

```typescript
// app/app/pricing/page.tsx
"use client";

import { PricingCards } from "@/components/billing/PricingCards";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Escolha o plano ideal para sua evolução como trader.
      </p>
      <PricingCards />
    </div>
  );
}
```

- [ ] **Step 2: Add Pricing + Settings links to AppHeader nav**

Add between existing nav links:
```tsx
<Link href="/app/pricing">Planos</Link>
<Link href="/app/settings">Settings</Link>
```

Also add `SubscriptionBadge` next to the user name in the header.

- [ ] **Step 3: Commit**

```bash
git add app/app/pricing/page.tsx components/layout/AppHeader.tsx
git commit -m "feat: pricing page + nav links for plans and settings"
```

---

### Task 14: Subscription success page

**Files:**
- Create: `app/app/subscription/success/page.tsx`

- [ ] **Step 1: Create success page**

```typescript
// app/app/subscription/success/page.tsx
"use client";

import { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/components/context/SubscriptionContext";

export default function SubscriptionSuccessPage() {
  const { refreshSubscription, plan } = useSubscription();

  useEffect(() => {
    // Refresh subscription data after successful checkout
    refreshSubscription();
  }, [refreshSubscription]);

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Assinatura ativada!</h1>
      <p className="text-muted-foreground mb-8">
        Seu plano {plan === "elite" ? "Elite" : "Pro"} está ativo. Aproveite todos os recursos.
      </p>
      <Link
        href="/app"
        className="inline-flex rounded-full bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Ir para o Dashboard
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/app/subscription/success/page.tsx
git commit -m "feat: subscription success page with auto-refresh"
```

---

## Chunk 4: Settings Page

### Task 15: Settings page

**Files:**
- Create: `app/app/settings/page.tsx`

- [ ] **Step 1: Create settings page**

Build a settings page with 4 sections following the design doc (section 10):

**1. Perfil** — Display name (editable), email (read-only), trader type dropdown, timezone auto-detected
**2. Assinatura** — Current plan with SubscriptionBadge, status, renewal date, "Gerenciar assinatura" button → Stripe Customer Portal, AI Coach usage display
**3. Preferências** — Theme toggle (uses existing ThemeProvider), sound alerts toggle (localStorage)
**4. Danger Zone** — "Cancelar assinatura" → Customer Portal, "Excluir conta" → modal with confirmation input "EXCLUIR"

Use project conventions: `mx-auto max-w-6xl px-6 py-10`, `rounded-[22px]` cards, inline backgroundColor.

The "Gerenciar assinatura" button should call `POST /api/billing/portal` and redirect to the returned URL.

Profile save should update the `profiles` table via Supabase client.

- [ ] **Step 2: Verify it renders and theme toggle works**

```bash
npm run dev
# Navigate to /app/settings
```

- [ ] **Step 3: Commit**

```bash
git add app/app/settings/page.tsx
git commit -m "feat: settings page with profile, subscription, preferences, danger zone"
```

---

## Chunk 5: Expanded Onboarding

### Task 16: Expand onboarding to 4 steps

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Read current onboarding page**

Read `app/onboarding/page.tsx` to understand current structure.

- [ ] **Step 2: Add 3 new steps**

Expand from 1 step (display name) to 4 steps with a progress indicator:

**Step 1 — Nome** (existing): "Como quer ser chamado?" → text input
**Step 2 — Perfil** (new): "O que melhor descreve você?" → 4 cards: "Mesa Proprietária", "Capital Pessoal", "Crypto", "Mix de tudo"
**Step 3 — Contas** (new): If prop selected: "Qual firma?" → preset buttons (FTMO, The5ers, etc.) with auto-fill. Include "Não sei, configurar depois" skip button. Timezone auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
**Step 4 — Import** (new): Drop zone for first report upload. "Explorar primeiro" skip button.

Save new data: `trader_type`, `timezone` to profiles table (add columns if needed via migration).

Progress bar at top showing step 1/4, 2/4, etc.

Navigation: Next/Back buttons. Steps 2-4 can be skipped.

- [ ] **Step 3: Add profiles columns migration if needed**

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trader_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'BRL';
```

- [ ] **Step 4: Test full onboarding flow**

```bash
npm run dev
# Navigate to /onboarding and complete all 4 steps
```

- [ ] **Step 5: Commit**

```bash
git add app/onboarding/page.tsx supabase/migrations/
git commit -m "feat: expanded onboarding with trader profile, accounts, first import"
```

---

## Chunk 6: Sentry + Final Integration

### Task 17: Sentry configuration

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `next.config.js`

- [ ] **Step 1: Create Sentry config files**

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

```typescript
// sentry.edge.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

- [ ] **Step 2: Update next.config.js for Sentry**

Wrap existing config with `withSentryConfig()`:

```javascript
const { withSentryConfig } = require("@sentry/nextjs");
// ... existing config ...
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
});
```

- [ ] **Step 3: Verify build still works**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts next.config.js
git commit -m "feat: sentry error tracking integration"
```

---

### Task 18: Final integration + smoke test

- [ ] **Step 1: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run dev server and test flows**

```bash
npm run dev
```

Test each flow:
1. `/app/pricing` — pricing cards render, annual toggle works, confetti fires
2. Click "Assinar Pro" — redirects to Stripe Checkout (test mode)
3. Complete checkout with test card `4242 4242 4242 4242` → redirects to success page
4. `/app/settings` — shows current plan, "Gerenciar assinatura" works
5. `/app/journal` — PaywallGate blocks Pro features for Free users
6. `/onboarding` — 4 steps complete successfully

- [ ] **Step 3: Verify production build**

```bash
npm run build
```

- [ ] **Step 4: Final commit + push**

```bash
git add -A
git commit -m "feat: Phase 1 MVP billing complete - Stripe, pricing, tier gating, settings, onboarding, sentry"
git push
```

---

## Implementation Notes

### Stripe Test Mode
- Use test API keys during development
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC
- Test Pix: use Stripe test payment methods if available
- Set up webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Environment Setup Checklist
Before starting implementation:
1. Create Stripe account (stripe.com) if not exists
2. Create 2 Products: "Pro" and "Elite"
3. Create 4 Prices (monthly + annual for each)
4. Configure Customer Portal in Stripe Dashboard
5. Create Sentry project (sentry.io) and get DSN
6. Run the subscriptions migration on Supabase
7. Install Stripe CLI for webhook testing: `stripe login && stripe listen`

### Key Architectural Decisions
- **Stripe Hosted Checkout** (not embedded) — less code, PCI compliance
- **Service role key** in webhook only (bypasses RLS for server-side writes)
- **Poll every 5 min** for subscription updates (simpler than Supabase Realtime)
- **Idempotency via `stripe_event_id`** — prevents duplicate webhook processing
- **PaywallGate with blur** — shows content behind paywall to entice upgrade
