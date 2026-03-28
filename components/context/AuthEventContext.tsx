"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthEventState {
  event: AuthChangeEvent | null;
  session: Session | null;
}

const AuthEventContext = createContext<AuthEventState>({
  event: null,
  session: null,
});

/**
 * Single onAuthStateChange listener that broadcasts auth events to all consumers.
 * Eliminates redundant listeners in AuthGate, ActiveAccountContext, SubscriptionContext.
 */
export function AuthEventProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthEventState>({
    event: null,
    session: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;
        setAuthState({ event, session });
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => authState, [authState]);

  return (
    <AuthEventContext.Provider value={value}>
      {children}
    </AuthEventContext.Provider>
  );
}

export function useAuthEvent(): AuthEventState {
  return useContext(AuthEventContext);
}
