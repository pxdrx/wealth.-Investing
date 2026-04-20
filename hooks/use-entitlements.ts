"use client";

import { useContext, useMemo } from "react";
import { SubscriptionContext } from "@/components/context/SubscriptionContext";
import { getTierLimits } from "@/lib/subscription-shared";
import type { Plan, SubscriptionRow } from "@/lib/subscription";
import type { TierLimits } from "@/lib/subscription-shared";
import { hasAccess, type Feature } from "@/lib/entitlements";

export interface EntitlementsValue {
  plan: Plan;
  status: string;
  subscription: SubscriptionRow | null;
  limits: TierLimits;
  isProOrAbove: boolean;
  isUltra: boolean;
  isMentor: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  hasAccess: (feature: Feature) => boolean;
}

export function useEntitlements(): EntitlementsValue {
  const ctx = useContext(SubscriptionContext);

  return useMemo<EntitlementsValue>(() => {
    if (!ctx) {
      return {
        plan: "free",
        status: "active",
        subscription: null,
        limits: getTierLimits("free"),
        isProOrAbove: false,
        isUltra: false,
        isMentor: false,
        isLoading: false,
        refreshSubscription: async () => {},
        hasAccess: (feature) => hasAccess("free", feature),
      };
    }
    return {
      ...ctx,
      hasAccess: (feature) => hasAccess(ctx.plan, feature),
    };
  }, [ctx]);
}
