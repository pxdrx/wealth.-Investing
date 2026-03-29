"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import {
  DEFAULT_LAYOUT,
  mergeLayout,
  type DashboardLayout,
} from "@/components/dashboard/WidgetRenderer";
import type { DayNote } from "@/components/calendar/types";
import type { Account } from "@/lib/accounts";

type JournalTradeKpiRow = {
  id: string;
  net_pnl_usd: number | null;
  opened_at: string | null;
  account_id: string | null;
  symbol: string | null;
  direction: string | null;
};

type PropAccountRow = {
  account_id: string;
  firm_name: string;
  phase: string;
  starting_balance_usd: number;
  max_daily_loss_percent?: number;
  max_overall_loss_percent?: number;
};

export type { JournalTradeKpiRow, PropAccountRow };

interface DashboardData {
  userId: string | null;
  sessionChecked: boolean;
  journalTrades: JournalTradeKpiRow[];
  journalLoading: boolean;
  accountsById: Map<string, Account>;
  dayNotes: Record<string, DayNote>;
  propAccounts: PropAccountRow[];
  propPayoutsTotal: number;
  dashboardLayout: DashboardLayout;
  refreshData: () => void;
}

export function useDashboardData(): DashboardData {
  const { accounts: ctxAccounts } = useActiveAccount();

  const [userId, setUserId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [journalTrades, setJournalTrades] = useState<JournalTradeKpiRow[]>([]);
  const [journalLoading, setJournalLoading] = useState(true);

  const [accountsById, setAccountsById] = useState<Map<string, Account>>(new Map());
  const [dayNotes, setDayNotes] = useState<Record<string, DayNote>>({});

  const [propAccounts, setPropAccounts] = useState<PropAccountRow[]>([]);
  const [propPayoutsTotal, setPropPayoutsTotal] = useState<number>(0);

  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);

  // Re-fetch trigger: increments when the page regains visibility (e.g. SPA nav back)
  const [refreshKey, setRefreshKey] = useState(0);
  const initialLoadDone = useRef(false);
  const lastRefetch = useRef(0);

  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Sync dashboard data when accounts change in context (e.g., deletion, rename)
  const ctxAccountsKey = ctxAccounts.map((a) => `${a.id}:${a.name}:${a.is_active}`).join("|");
  const prevCtxAccountsKey = useRef(ctxAccountsKey);
  useEffect(() => {
    if (prevCtxAccountsKey.current !== ctxAccountsKey && ctxAccounts.length > 0) {
      prevCtxAccountsKey.current = ctxAccountsKey;
      setRefreshKey((k) => k + 1);
    }
  }, [ctxAccountsKey, ctxAccounts.length]);

  // PERF-002: Only use visibilitychange (not focus) with 30s cooldown to prevent double-fetch
  useEffect(() => {
    function handleVisibility() {
      if (
        document.visibilityState === "visible" &&
        initialLoadDone.current &&
        Date.now() - lastRefetch.current > 30_000
      ) {
        lastRefetch.current = Date.now();
        setRefreshKey((k) => k + 1);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Session + layout fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        console.warn("[dashboard] getSession error", error.message);
        // Only clear userId on initial load; keep existing session on background refresh
        if (!initialLoadDone.current) {
          setUserId(null);
        }
        setSessionChecked(true);
        initialLoadDone.current = true;
        setJournalLoading(false);
        return;
      }
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setSessionChecked(true);
      initialLoadDone.current = true;

      // Load dashboard layout from profile (DB first, localStorage fallback)
      if (uid) {
        let loaded = false;
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("dashboard_layout")
            .eq("id", uid)
            .maybeSingle();
          if (!cancelled && profile?.dashboard_layout) {
            setDashboardLayout(mergeLayout(profile.dashboard_layout as DashboardLayout));
            loaded = true;
          }
        } catch {}
        if (!loaded && !cancelled) {
          try {
            const stored = localStorage.getItem(`wealth-dash-layout-${uid}`);
            if (stored) setDashboardLayout(mergeLayout(JSON.parse(stored)));
          } catch {}
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Journal trades, accounts, prop data, day notes fetch
  useEffect(() => {
    if (!userId) {
      setJournalTrades([]);
      setAccountsById(new Map());
      return;
    }
    let cancelled = false;
    // Only show loading spinner on initial load, not background refreshes (stale-while-revalidate)
    if (!initialLoadDone.current) {
      setJournalLoading(true);
    }
    (async () => {
      try {
        const [{ data, error }, accountsRes] = await Promise.all([
          supabase
            .from("journal_trades")
            .select("id, net_pnl_usd, opened_at, account_id, symbol, direction")
            .eq("user_id", userId)
            .order("opened_at", { ascending: false }),
          supabase
            .from("accounts")
            .select("id, name, kind, is_active, created_at" as const)
            .eq("user_id", userId),
        ]);
        if (cancelled) return;
        if (error) {
          console.warn("[dashboard] journal kpis error", error.message);
          setJournalTrades([]);
        } else {
          setJournalTrades((data ?? []) as JournalTradeKpiRow[]);
        }

        const accountsMap = new Map<string, Account>();
        for (const row of accountsRes.data ?? []) {
          const acc = row as Account;
          accountsMap.set(acc.id, acc);
        }
        setAccountsById(accountsMap);

        // Fetch prop_accounts and prop_payouts
        const accountIds = (accountsRes.data ?? []).map((a) => a.id);
        if (accountIds.length > 0) {
          const [propAccountsRes, propPayoutsRes] = await Promise.all([
            supabase
              .from("prop_accounts")
              .select("account_id, firm_name, phase, starting_balance_usd, max_daily_loss_percent, max_overall_loss_percent")
              .in("account_id", accountIds),
            supabase
              .from("prop_payouts")
              .select("amount_usd")
              .eq("user_id", userId),
          ]);
          if (!cancelled) {
            setPropAccounts((propAccountsRes.data ?? []) as PropAccountRow[]);
            const total = (propPayoutsRes.data ?? []).reduce(
              (sum, row) => sum + (row.amount_usd ?? 0),
              0
            );
            setPropPayoutsTotal(total);
          }
        }

        // Fetch day notes for calendar
        const { data: notesData } = await supabase
          .from("day_notes")
          .select("date, observation, tags")
          .eq("user_id", userId);
        if (!cancelled && notesData) {
          const notesMap: Record<string, DayNote> = {};
          for (const n of notesData) {
            notesMap[n.date] = { observation: n.observation, tags: n.tags };
          }
          setDayNotes(notesMap);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("[dashboard] journal kpis exception", e);
          // Only clear data on initial load failure; keep stale data on background refresh
          if (!initialLoadDone.current) {
            setJournalTrades([]);
            setAccountsById(new Map());
          }
        }
      } finally {
        if (!cancelled) {
          setJournalLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  return {
    userId,
    sessionChecked,
    journalTrades,
    journalLoading,
    accountsById,
    dayNotes,
    propAccounts,
    propPayoutsTotal,
    dashboardLayout,
    refreshData,
  };
}
