# Conversion Funnel — Track B

Source of truth for landing-page analytics and conversion metrics on `wealth.Investing`. Every event fires through `track()` in [`lib/analytics/events.ts`](../lib/analytics/events.ts), which emits to **Vercel Analytics** (aggregates) and writes a row to the Supabase `analytics_events` table (raw rows, user-joinable via `user_id`/`session_id`).

---

## Event inventory

| # | Event | Fired where | Props | Funnel stage |
|---|-------|-------------|-------|--------------|
| 1 | `landing_view` | `LandingAnalytics` on mount (any `/[locale]` route) | `{ locale, referrer, utm_source, utm_medium, utm_campaign }` | **Awareness** |
| 2 | `hero_cta_click` | Hero primary/ghost, Pricing row CTAs, FAQ CTA, Nav "Entrar", Footer, Exit intent modal, Sticky mobile | `{ variant, position?, source? }` — `source`: `hero \| pricing \| faq \| exit_intent \| sticky_mobile \| nav \| footer` | **Interest** |
| 3 | `pricing_view` | `PricingViewAnalytics` IntersectionObserver (pricing block ≥50% viewport) | `{ locale }` | **Consideration** |
| 4 | `exit_intent_shown` | `ExitIntentModal` on first open (desktop, once/session, 10s arm) | `{ locale }` | **Retention (last-mile)** |
| 5 | `sticky_mobile_shown` | `StickyMobileCta` first time visible (>30% scroll, mobile) | `{ locale }` | **Retention (last-mile)** |
| 6 | `sticky_mobile_dismissed` | `StickyMobileCta` X button | `{ locale }` | **Friction signal** |
| 7 | `plan_select` | `PricingCards` plan CTA click | `{ plan, billing }` | **Intent** |
| 8 | `checkout_start` | Stripe checkout session init | `{ plan }` | **Intent** |
| 9 | `signup_complete` | `/auth/callback` → profile created | `{ plan, source? }` | **Conversion** |

> **9 canonical funnel events.** `mt5_connect_start`, `mt5_connect_success`, `ultra_upgrade_clicked` exist but belong to the authenticated app, not the public funnel.

---

## Expected journey

```
landing_view
    │
    ├── (optional) social_proof scroll
    │
    ├── hero_cta_click { source: "hero" }         ── fast path ──► signup_complete
    │
    ├── pricing_view
    │     │
    │     ├── plan_select { plan, billing }
    │     │       │
    │     │       └── checkout_start { plan } ──► signup_complete
    │     │
    │     └── hero_cta_click { source: "pricing" }
    │
    ├── (desktop, exit attempt)
    │     exit_intent_shown
    │         └── hero_cta_click { source: "exit_intent" } ──► signup_complete
    │
    └── (mobile, deep scroll)
          sticky_mobile_shown
              ├── hero_cta_click { source: "sticky_mobile" } ──► signup_complete
              └── sticky_mobile_dismissed                    ──► abandon
```

---

## Target metrics (weekly, rolling 7 days)

| Metric | Formula | Target (v1) | Alert if |
|--------|---------|-------------|----------|
| **Hero CTR** | `hero_cta_click{source=hero} / landing_view` | ≥ 6% | < 3% |
| **Pricing reach** | `pricing_view / landing_view` | ≥ 35% | < 20% |
| **Plan-select rate** | `plan_select / pricing_view` | ≥ 12% | < 6% |
| **Checkout rate** | `checkout_start / plan_select` | ≥ 70% | < 50% |
| **Signup conversion (overall)** | `signup_complete / landing_view` | ≥ 1.2% | < 0.4% |
| **Exit-intent save rate** | `hero_cta_click{source=exit_intent} / exit_intent_shown` | ≥ 8% | < 3% |
| **Sticky mobile CTR** | `hero_cta_click{source=sticky_mobile} / sticky_mobile_shown` | ≥ 4% | < 1.5% |
| **Sticky dismiss ratio** | `sticky_mobile_dismissed / sticky_mobile_shown` | ≤ 40% | > 70% |

Scroll-depth on pricing is approximated by `pricing_view` — IntersectionObserver is more reliable than scrollY thresholds in long pages.

---

## Instrumentation by component

| Component | File | Events emitted |
|-----------|------|----------------|
| `LandingAnalytics` | [`components/landing/LandingAnalytics.tsx`](../components/landing/LandingAnalytics.tsx) | `landing_view` |
| `Hero` | [`components/landing/Hero.tsx`](../components/landing/Hero.tsx) | `hero_cta_click { source: "hero" }` |
| `HeroCta` | [`components/landing/HeroCta.tsx`](../components/landing/HeroCta.tsx) | `hero_cta_click { source: "hero" }` |
| `PricingSummary` / row CTA | [`components/landing/PricingSummary.tsx`](../components/landing/PricingSummary.tsx) | `hero_cta_click { source: "pricing" }` |
| `PricingViewAnalytics` | [`components/landing/PricingViewAnalytics.tsx`](../components/landing/PricingViewAnalytics.tsx) | `pricing_view` |
| `PricingCards` (billing) | `components/billing/PricingCards.tsx` | `plan_select` |
| `FAQ` | [`components/landing/FAQ.tsx`](../components/landing/FAQ.tsx) | `hero_cta_click { source: "faq" }` |
| `ExitIntentModal` | [`components/landing/ExitIntentModal.tsx`](../components/landing/ExitIntentModal.tsx) | `exit_intent_shown`, `hero_cta_click { source: "exit_intent" }` |
| `StickyMobileCta` | [`components/landing/StickyMobileCta.tsx`](../components/landing/StickyMobileCta.tsx) | `sticky_mobile_shown`, `sticky_mobile_dismissed`, `hero_cta_click { source: "sticky_mobile" }` |
| Stripe checkout init | `app/api/billing/checkout/route.ts` | `checkout_start` |
| Auth callback | `app/auth/callback/page.tsx` | `signup_complete` |

---

## Validation queries (Supabase)

Daily funnel:
```sql
select
  event_name,
  count(*) as n,
  count(distinct session_id) as sessions
from analytics_events
where created_at >= now() - interval '7 days'
group by event_name
order by n desc;
```

Hero CTR by source (last 7d):
```sql
select
  (props->>'source') as source,
  count(*) filter (where event_name = 'hero_cta_click') as clicks,
  (select count(*) from analytics_events
    where event_name = 'landing_view'
      and created_at >= now() - interval '7 days') as views
from analytics_events
where event_name = 'hero_cta_click'
  and created_at >= now() - interval '7 days'
group by 1
order by clicks desc;
```

---

## Change policy

- Never rename an event. Add new ones; keep old ones emitting until dashboards migrate (≥ 14 days).
- Add new props as optional. Flattening in `track()` silently coerces non-primitives to strings — prefer `string | number | boolean | null`.
- New `CtaSource` values → extend the union in `lib/analytics/events.ts` and document the component emitting it here.
- Run `npm run i18n:check` before adding any new CTA copy.

---

## Owners

- **Track B (landing):** this doc
- **Billing / checkout events:** Track C
- **Auth callback / signup_complete:** Track C

Questions → bump in [`docs/TRACK-COORDINATION.md`](./TRACK-COORDINATION.md).
