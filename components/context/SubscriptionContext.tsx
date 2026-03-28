// TODO: [TECH-DEBT] Multiple onAuthStateChange listeners (AuthGate, ActiveAccountContext, SubscriptionContext)
// cause redundant session fetches. Consider centralizing auth state in a single provider.
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMySubscription, getTierLimits, isProOrAbove, isUltra } from "@/lib/subscription";
import type { Plan, SubscriptionRow, TierLimits } from "@/lib/subscription";
import { supabase } from "@/lib/supabase/client";

interface SubscriptionContextValue {
  plan: Plan;
  status: string;
  subscription: SubscriptionRow | null;
  limits: TierLimits;
  isProOrAbove: boolean;
  isUltra: boolean;
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
      if (event === "SIGNED_IN") load();
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

  // Poll every 15 min — no visibility change handler to avoid re-renders on tab switch
  useEffect(() => {
    const interval = setInterval(load, 15 * 60 * 1000);
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
    isUltra: isUltra(plan),
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
      isUltra: false,
      isLoading: true,
      refreshSubscription: async () => {},
    };
  }
  return ctx;
}
