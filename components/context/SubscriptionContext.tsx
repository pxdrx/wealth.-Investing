"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMySubscription, getTierLimits, isProOrAbove, isUltra } from "@/lib/subscription";
import type { Plan, SubscriptionRow, TierLimits } from "@/lib/subscription";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { useAuthEvent } from "@/components/context/AuthEventContext";

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
  const { event: authEvent } = useAuthEvent();

  const load = useCallback(async (silent = false) => {
    // silent=true: keep existing subscription visible while re-fetching (tab return, poll)
    if (!silent) setIsLoading(true);
    try {
      const sub = await fetchMySubscription();
      // When silent (tab return/poll), only update if we got a real result.
      // If session was momentarily null (token refreshing), keep the cached plan.
      if (silent && sub === null) return;
      setSubscription(sub);
    } catch {
      // On error, keep existing subscription — don't flash to free
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    let mounted = true;

    // Safety timeout: force isLoading=false after 10s to prevent infinite spinner
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setIsLoading((prev) => {
          if (prev) console.warn("[subscription] Safety timeout: forcing isLoading=false after 10s");
          return false;
        });
      }
    }, 5_000);

    async function init() {
      const { data: { session } } = await safeGetSession();
      if (!mounted) return;
      if (session) await load();
      else setIsLoading(false);
    }

    init();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [load]);

  // React to centralized auth events (replaces local onAuthStateChange)
  useEffect(() => {
    if (authEvent === "SIGNED_IN") {
      // Silent reload: keep current subscription visible while re-fetching.
      // This prevents flashing to "free" on tab return (token refresh emits SIGNED_IN).
      load(true);
    } else if (authEvent === "SIGNED_OUT") {
      setSubscription(null);
      setIsLoading(false);
    }
  }, [authEvent, load]);

  // Poll every 15 min — silent to avoid flashing free
  useEffect(() => {
    const interval = setInterval(() => load(true), 15 * 60 * 1000);
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
      isLoading: false,
      refreshSubscription: async () => {},
    };
  }
  return ctx;
}
