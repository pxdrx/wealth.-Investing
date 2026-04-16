"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { calculateFullDd, evaluateAlerts } from "@/lib/metaapi/monitor";
import type { LiveDdResult, AlertConfig, AlertAction } from "@/lib/metaapi/monitor";

export interface LivePosition {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  swap: number;
  commission: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openTime: string;
  comment: string;
  magic: number;
}

export interface LiveMonitoringState {
  isConnected: boolean;
  isLoading: boolean;
  equity: number | null;
  balance: number | null;
  dailyPnl: number | null;
  dailyDdPct: number | null;
  overallDdPct: number | null;
  openPositionsCount: number;
  unrealizedPnl: number | null;
  lastUpdate: Date | null;
  connectionStatus: string | null;
  error: string | null;
  metaApiAccountId: string | null;
  alertConfigs: AlertConfig[];
  activeAlerts: ActiveAlert[];
}

export interface ActiveAlert {
  id: string;
  alertType: string;
  severity: string;
  actualPct: number;
  message: string;
  createdAt: string;
}

interface ConnectionData {
  connected: boolean;
  connectionStatus?: string;
  metaApiAccountId?: string;
  lastSync?: string;
  lastError?: string;
  snapshot?: {
    equity: number;
    balance: number;
    margin: number;
    free_margin: number;
    open_positions_count: number;
    unrealized_pnl: number;
    daily_pnl: number;
    daily_dd_pct: number;
    overall_dd_pct: number;
    recorded_at: string;
  } | null;
  alertConfigs?: Array<{
    id: string;
    alert_type: string;
    warning_threshold_pct: number;
    critical_threshold_pct: number;
    is_active: boolean;
  }>;
  activeAlerts?: Array<{
    id: string;
    alert_type: string;
    severity: string;
    actual_pct: number;
    message: string;
    created_at: string;
  }>;
}

const POLL_INTERVAL_MS = 30_000; // Poll status every 30 seconds
const TRADE_SYNC_INTERVAL_MS = 5 * 60_000; // Sync trades every 5 minutes

/**
 * Hook for live monitoring of a prop firm account via MetaAPI.
 * Uses polling + Supabase Realtime for alerts.
 * Also periodically syncs trade history to journal_trades.
 */
export function useLiveMonitoring(accountId: string | null): LiveMonitoringState & {
  refresh: () => Promise<void>;
  syncTrades: () => Promise<{ ok: boolean; imported?: number; error?: string }>;
  connect: (brokerLogin: string, brokerServer: string, investorPassword: string, platform?: "mt4" | "mt5") => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => Promise<void>;
} {
  const [state, setState] = useState<LiveMonitoringState>({
    isConnected: false,
    isLoading: false,
    equity: null,
    balance: null,
    dailyPnl: null,
    dailyDdPct: null,
    overallDdPct: null,
    openPositionsCount: 0,
    unrealizedPnl: null,
    lastUpdate: null,
    connectionStatus: null,
    error: null,
    metaApiAccountId: null,
    alertConfigs: [],
    activeAlerts: [],
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectedRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    if (!accountId || disconnectedRef.current) return;

    try {
      const { data: { session } } = await safeGetSession();
      if (!session?.access_token) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 8_000);

      let res: Response;
      try {
        res = await fetch(`/api/metaapi/status?accountId=${accountId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(fetchTimeout);
      }

      const json = await res.json();
      if (!json.ok) {
        setState((prev) => ({ ...prev, isLoading: false, error: json.error }));
        return;
      }

      const data: ConnectionData = json.data;

      if (!data.connected) {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          connectionStatus: null,
          error: null,
        }));
        return;
      }

      const snapshot = data.snapshot;
      const alertConfigs: AlertConfig[] = (data.alertConfigs ?? []).map((c) => ({
        id: c.id,
        alertType: c.alert_type as "daily_dd" | "overall_dd",
        warningThresholdPct: c.warning_threshold_pct,
        criticalThresholdPct: c.critical_threshold_pct,
        isActive: c.is_active,
      }));

      const activeAlerts: ActiveAlert[] = (data.activeAlerts ?? []).map((a) => ({
        id: a.id,
        alertType: a.alert_type,
        severity: a.severity,
        actualPct: a.actual_pct,
        message: a.message,
        createdAt: a.created_at,
      }));

      setState({
        isConnected: true,
        isLoading: false,
        equity: snapshot?.equity ?? null,
        balance: snapshot?.balance ?? null,
        dailyPnl: snapshot?.daily_pnl ?? null,
        dailyDdPct: snapshot?.daily_dd_pct ?? null,
        overallDdPct: snapshot?.overall_dd_pct ?? null,
        openPositionsCount: snapshot?.open_positions_count ?? 0,
        unrealizedPnl: snapshot?.unrealized_pnl ?? null,
        lastUpdate: snapshot?.recorded_at ? new Date(snapshot.recorded_at) : null,
        connectionStatus: data.connectionStatus ?? null,
        error: data.lastError ?? null,
        metaApiAccountId: data.metaApiAccountId ?? null,
        alertConfigs,
        activeAlerts,
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false, error: "Erro ao verificar status" }));
    }
  }, [accountId]);

  // Initial fetch + polling
  useEffect(() => {
    if (!accountId) {
      setState((prev) => ({ ...prev, isConnected: false, isLoading: false }));
      return;
    }

    disconnectedRef.current = false;
    setState((prev) => ({ ...prev, isLoading: true }));
    fetchStatus();

    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [accountId, fetchStatus]);

  // Pause polling when tab is hidden
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      } else if (!disconnectedRef.current) {
        fetchStatus();
        pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchStatus]);

  // Supabase Realtime: listen for live alert changes (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!accountId) return;

    const channel = supabase
      .channel(`live-alerts-${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_alerts_log",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            alert_type: string;
            severity: string;
            actual_pct: number;
            message: string;
            created_at: string;
            dismissed?: boolean;
          };

          // Only add if not already dismissed
          if (row.dismissed) return;

          setState((prev) => {
            // Deduplicate: don't add if already in list
            if (prev.activeAlerts.some((a) => a.id === row.id)) return prev;
            return {
              ...prev,
              activeAlerts: [
                {
                  id: row.id,
                  alertType: row.alert_type,
                  severity: row.severity,
                  actualPct: row.actual_pct,
                  message: row.message,
                  createdAt: row.created_at,
                },
                ...prev.activeAlerts,
              ],
            };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_alerts_log",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; dismissed?: boolean };
          if (row.dismissed) {
            // Remove dismissed alert from state immediately
            setState((prev) => ({
              ...prev,
              activeAlerts: prev.activeAlerts.filter((a) => a.id !== row.id),
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "live_alerts_log",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          const row = payload.old as { id: string };
          setState((prev) => ({
            ...prev,
            activeAlerts: prev.activeAlerts.filter((a) => a.id !== row.id),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  const connect = useCallback(
    async (
      brokerLogin: string,
      brokerServer: string,
      investorPassword: string,
      platform: "mt4" | "mt5" = "mt5"
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!accountId) return { ok: false, error: "Conta não selecionada" };
      disconnectedRef.current = false;

      try {
        const { data: { session } } = await safeGetSession();
        if (!session?.access_token) return { ok: false, error: "Sessão expirada" };

        // Step 1: Provision account (fast, returns "connecting")
        const res = await fetch("/api/metaapi/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ accountId, brokerLogin, brokerServer, investorPassword, platform }),
        });

        const json = await res.json();
        if (!json.ok) return { ok: false, error: json.error };

        // Step 2: Poll /api/metaapi/deploy until connected or error (max 3 min)
        const MAX_ATTEMPTS = 18; // 18 * 10s = 3 minutes
        const POLL_DELAY = 10_000;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, POLL_DELAY));

          const deployRes = await fetch("/api/metaapi/deploy", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ accountId }),
          });

          const deployJson = await deployRes.json();

          // Server returned an error — fail immediately
          if (!deployJson.ok) {
            return { ok: false, error: deployJson.error || "Erro ao verificar status da conexão" };
          }

          const status = deployJson.data?.connectionStatus;

          if (status === "connected") {
            await fetchStatus();
            return { ok: true };
          }

          if (status === "error") {
            return { ok: false, error: deployJson.data?.error ?? "Erro na conexão com o broker" };
          }

          // Still "connecting" — continue polling
        }

        return { ok: false, error: "Timeout: a conexão demorou mais de 3 minutos. Verifique se as credenciais estão corretas e tente novamente." };
      } catch {
        return { ok: false, error: "Erro de conexão" };
      }
    },
    [accountId, fetchStatus]
  );

  const syncTrades = useCallback(async (): Promise<{ ok: boolean; imported?: number; error?: string }> => {
    if (!accountId) return { ok: false, error: "Conta não selecionada" };

    try {
      const { data: { session } } = await safeGetSession();
      if (!session?.access_token) return { ok: false, error: "Sessão expirada" };

      const res = await fetch("/api/metaapi/sync-trades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accountId }),
      });

      const json = await res.json();
      if (!json.ok) return { ok: false, error: json.error };
      return { ok: true, imported: json.data?.imported ?? 0 };
    } catch {
      return { ok: false, error: "Erro ao sincronizar trades" };
    }
  }, [accountId]);

  // Periodic trade sync (every 5 minutes when connected)
  const tradeSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTradesRef = useRef(syncTrades);
  syncTradesRef.current = syncTrades;

  useEffect(() => {
    if (!state.isConnected || !accountId) {
      if (tradeSyncRef.current) clearInterval(tradeSyncRef.current);
      tradeSyncRef.current = null;
      return;
    }

    tradeSyncRef.current = setInterval(() => {
      syncTradesRef.current().catch(() => {});
    }, TRADE_SYNC_INTERVAL_MS);

    return () => {
      if (tradeSyncRef.current) clearInterval(tradeSyncRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isConnected, accountId]);

  const disconnect = useCallback(async () => {
    if (!accountId) return;

    try {
      const { data: { session } } = await safeGetSession();
      if (!session?.access_token) return;

      // Stop all polling immediately
      disconnectedRef.current = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      await fetch("/api/metaapi/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accountId }),
      });

      setState((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        equity: null,
        balance: null,
        dailyPnl: null,
        dailyDdPct: null,
        overallDdPct: null,
        connectionStatus: null,
        metaApiAccountId: null,
        alertConfigs: [],
        activeAlerts: [],
      }));
    } catch {
      // ignore
    }
  }, [accountId]);

  const refresh = useCallback(async () => {
    disconnectedRef.current = false;
    return fetchStatus();
  }, [fetchStatus]);

  return {
    ...state,
    refresh,
    syncTrades,
    connect,
    disconnect,
  };
}
