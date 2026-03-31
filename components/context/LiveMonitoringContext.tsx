"use client";

import React, { createContext, useContext } from "react";
import { useLiveMonitoring } from "@/hooks/useLiveMonitoring";
import type { LiveMonitoringState, ActiveAlert } from "@/hooks/useLiveMonitoring";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { useSubscription } from "@/components/context/SubscriptionContext";

interface LiveMonitoringContextValue extends LiveMonitoringState {
  refresh: () => Promise<void>;
  syncTrades: () => Promise<{ ok: boolean; imported?: number; error?: string }>;
  connect: (brokerLogin: string, brokerServer: string, investorPassword: string, platform?: "mt4" | "mt5") => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => Promise<void>;
}

const LiveMonitoringContext = createContext<LiveMonitoringContextValue | null>(null);

export function LiveMonitoringProvider({ children }: { children: React.ReactNode }) {
  const { activeAccountId, accounts } = useActiveAccount();
  const { isUltra } = useSubscription();

  // Only monitor prop accounts for Ultra users
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const shouldMonitor = isUltra && activeAccount?.kind === "prop";
  const monitorAccountId = shouldMonitor ? activeAccountId : null;

  const monitoring = useLiveMonitoring(monitorAccountId);

  return (
    <LiveMonitoringContext.Provider value={monitoring}>
      {children}
    </LiveMonitoringContext.Provider>
  );
}

export function useLiveMonitoringContext(): LiveMonitoringContextValue {
  const ctx = useContext(LiveMonitoringContext);
  if (!ctx) {
    throw new Error("useLiveMonitoringContext must be used within LiveMonitoringProvider");
  }
  return ctx;
}

/**
 * Safe version that returns null if outside provider (for components
 * that may render outside the authenticated area).
 */
export function useLiveMonitoringSafe(): LiveMonitoringContextValue | null {
  return useContext(LiveMonitoringContext);
}
