"use client";

import { track as vercelTrack } from "@vercel/analytics";
import { supabase } from "@/lib/supabase/client";

export type Plan = "basic" | "pro" | "ultra";
export type BillingInterval = "monthly" | "annual";

export type LandingViewProps = {
  locale: string;
  referrer?: string | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};
export type HeroCtaClickProps = { variant: "primary" | "ghost"; position?: string };
export type PricingViewProps = { locale: string };
export type PlanSelectProps = { plan: Plan; billing: BillingInterval };
export type CheckoutStartProps = { plan: Plan };
export type SignupCompleteProps = { plan: Plan; source?: string };
export type Mt5ConnectProps = Record<string, never>;
export type UltraUpgradeClickedProps = { from: string };

export type AnalyticsEventMap = {
  landing_view: LandingViewProps;
  hero_cta_click: HeroCtaClickProps;
  pricing_view: PricingViewProps;
  plan_select: PlanSelectProps;
  checkout_start: CheckoutStartProps;
  signup_complete: SignupCompleteProps;
  mt5_connect_start: Mt5ConnectProps;
  mt5_connect_success: Mt5ConnectProps;
  ultra_upgrade_clicked: UltraUpgradeClickedProps;
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

const SESSION_KEY = "wealth-session-id";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function parseUtmParams(): Pick<
  LandingViewProps,
  "utm_source" | "utm_medium" | "utm_campaign"
> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const v = p.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export function track<K extends AnalyticsEventName>(
  name: K,
  props?: AnalyticsEventMap[K],
): void {
  const payload = props ?? ({} as AnalyticsEventMap[K]);

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, payload);
  }

  try {
    const flat: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      if (v == null) flat[k] = null;
      else if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
      ) {
        flat[k] = v;
      } else {
        flat[k] = String(v);
      }
    }
    vercelTrack(name, flat);
  } catch {
    // Vercel Analytics not ready — ignore
  }

  if (typeof window !== "undefined") {
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await supabase.from("analytics_events").insert({
          event_name: name,
          props: payload,
          user_id: session?.user?.id ?? null,
          session_id: getSessionId(),
        });
      } catch {
        // Analytics failures never break UX
      }
    })();
  }
}
