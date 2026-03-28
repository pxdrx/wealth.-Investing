// TODO: [TECH-DEBT] Multiple onAuthStateChange listeners (AuthGate, ActiveAccountContext, SubscriptionContext)
// cause redundant session fetches. Consider centralizing auth state in a single provider.
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listMyAccountsWithProp, type AccountWithProp } from "@/lib/accounts";
import { supabase } from "@/lib/supabase/client";

const STORAGE_KEY = "activeAccountId";

type ActiveAccountContextValue = {
  accounts: AccountWithProp[];
  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;
  refreshAccounts: () => Promise<void>;
  isLoading: boolean;
};

const ActiveAccountContext = createContext<ActiveAccountContextValue | null>(null);

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Primeira conta ativa com prioridade: prop > personal > crypto */
function firstActiveAccountId(list: AccountWithProp[]): string | null {
  const active = list.filter((a) => a.is_active);
  const prop = active.find((a) => a.kind === "prop");
  if (prop) return prop.id;
  const personal = active.find((a) => a.kind === "personal");
  if (personal) return personal.id;
  const crypto = active.find((a) => a.kind === "crypto");
  if (crypto) return crypto.id;
  return active[0]?.id ?? null;
}

export function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountWithProp[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(readStoredId);
  const [isLoading, setIsLoading] = useState(true);

  const setActiveAccountId = useCallback((id: string | null) => {
    setActiveAccountIdState(id);
    persistId(id);
  }, []);

  const applyAccounts = useCallback((list: AccountWithProp[]) => {
    setAccounts(list);
    if (list.length === 0) {
      setActiveAccountIdState(null);
      persistId(null);
      return;
    }
    const stored = readStoredId();
    const found = stored && list.some((a) => a.id === stored);
    const effectiveId = found ? stored : firstActiveAccountId(list);
    setActiveAccountIdState(effectiveId);
    persistId(effectiveId);
  }, []);

  const refreshAccounts = useCallback(async () => {
    try {
      const list = await listMyAccountsWithProp();
      applyAccounts(list);
    } catch {
      // ignora
    }
  }, [applyAccounts]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session) {
          setAccounts([]);
          setActiveAccountIdState(null);
          persistId(null);
          setIsLoading(false);
          return;
        }
        const list = await listMyAccountsWithProp();
        if (!mounted) return;
        applyAccounts(list);
      } catch {
        // ignora
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();

    // Re-fetch accounts when auth state changes (fixes race condition after login redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_IN") {
        load();
      } else if (event === "SIGNED_OUT") {
        setAccounts([]);
        setActiveAccountIdState(null);
        persistId(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyAccounts]);

  const value = useMemo<ActiveAccountContextValue>(
    () => ({ accounts, activeAccountId, setActiveAccountId, refreshAccounts, isLoading }),
    [accounts, activeAccountId, setActiveAccountId, refreshAccounts, isLoading]
  );

  return (
    <ActiveAccountContext.Provider value={value}>
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount(): ActiveAccountContextValue {
  const ctx = useContext(ActiveAccountContext);
  if (!ctx) {
    return {
      accounts: [],
      activeAccountId: null,
      setActiveAccountId: () => {},
      refreshAccounts: async () => {},
      isLoading: true,
    };
  }
  return ctx;
}
