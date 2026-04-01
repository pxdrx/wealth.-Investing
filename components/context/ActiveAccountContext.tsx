"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listMyAccountsWithProp, type AccountWithProp } from "@/lib/accounts";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { useAuthEvent } from "@/components/context/AuthEventContext";

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
  const { event: authEvent } = useAuthEvent();

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

  // Initial load on mount
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data: { session } } = await safeGetSession();
        if (!mounted) return;
        if (!session) {
          setAccounts([]);
          setActiveAccountIdState(null);
          persistId(null);
          setIsLoading(false);
          return;
        }
        const list = await Promise.race([
          listMyAccountsWithProp(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Accounts load timeout")), 8_000)
          ),
        ]);
        if (!mounted) return;
        applyAccounts(list);
      } catch {
        // ignora — timeout or network error
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [applyAccounts]);

  // React to centralized auth events (replaces local onAuthStateChange)
  useEffect(() => {
    if (authEvent === "SIGNED_IN") {
      // Re-fetch accounts on sign-in (fixes race condition after login redirect)
      (async () => {
        try {
          const list = await listMyAccountsWithProp();
          applyAccounts(list);
        } catch {
          // ignora
        }
      })();
    } else if (authEvent === "SIGNED_OUT") {
      setAccounts([]);
      setActiveAccountIdState(null);
      persistId(null);
    }
  }, [authEvent, applyAccounts]);

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
      isLoading: false,
    };
  }
  return ctx;
}
