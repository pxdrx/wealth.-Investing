"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";
import { useAuthEvent } from "@/components/context/AuthEventContext";

/** Five minutes in milliseconds */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/** Four hours inactivity timeout (financial app security) */
const INACTIVITY_TIMEOUT_MS = 4 * 60 * 60 * 1000;

/** Periodic session check interval (5 minutes) */
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** Throttle interval for activity tracking writes (60 seconds) */
const ACTIVITY_THROTTLE_MS = 60 * 1000;

/** Maximum time to wait before forcing render or redirect */
const MAX_GATE_WAIT_MS = 4_000;

/** Maximum time for any auth operation before we consider it hung */
const AUTH_OPERATION_TIMEOUT_MS = 10_000;

const LAST_ACTIVITY_KEY = "trading-dashboard-last-activity";

function clearSessionAndRedirect() {
  // Manual localStorage cleanup per CLAUDE.md — never use supabase.auth.signOut()
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("sb-") || key === LAST_ACTIVITY_KEY)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  window.location.href = "/login";
}

function isInactive(): boolean {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!stored) return false;
  return Date.now() - Number(stored) > INACTIVITY_TIMEOUT_MS;
}

function touchActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

/**
 * Check if Supabase session tokens exist in localStorage.
 * If they do, we can optimistically render the page while verifying in background.
 */
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.includes("auth-token")) {
        return true;
      }
    }
  } catch {}
  return false;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  // OPTIMISTIC: if session tokens exist in localStorage, render immediately
  const [ready, setReady] = useState(() => {
    if (typeof window === "undefined") return false;
    // If inactive for too long, don't render optimistically
    if (isInactive()) return false;
    return hasStoredSession();
  });
  const sessionRef = useRef<{ expires_at?: number; user_id?: string } | null>(null);
  const bootstrapRanRef = useRef(false);
  const lastActivityWriteRef = useRef(0);
  const { event: authEvent } = useAuthEvent();

  // React to centralized auth events (replaces local onAuthStateChange)
  useEffect(() => {
    if (authEvent === "SIGNED_OUT") {
      sessionRef.current = null;
      clearSessionAndRedirect();
    }
  }, [authEvent]);

  // Throttled activity tracker
  const handleActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityWriteRef.current > ACTIVITY_THROTTLE_MS) {
      lastActivityWriteRef.current = now;
      touchActivity();
    }
  }, []);

  // Register activity listeners
  useEffect(() => {
    touchActivity();
    const events: Array<keyof WindowEventMap> = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [handleActivity]);

  // Main auth verification — runs in background, never blocks rendering if we have tokens
  useEffect(() => {
    let mounted = true;

    async function verifyAuth() {
      try {
        // Check inactivity timeout
        if (isInactive()) {
          clearSessionAndRedirect();
          return;
        }

        // Use cached session if token is not expiring soon
        if (sessionRef.current?.expires_at) {
          const msUntilExpiry = sessionRef.current.expires_at * 1000 - Date.now();
          if (msUntilExpiry > REFRESH_THRESHOLD_MS) {
            if (mounted) setReady(true);
            return;
          }
        }

        // Step 1: Check local session first (fast, no network)
        const { data: { session: localSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        // Step 2: If session is expired or expiring soon, try refresh FIRST
        const now = Date.now();
        const expiresAt = localSession?.expires_at;
        const isExpiredOrExpiring = !expiresAt || expiresAt * 1000 - now < REFRESH_THRESHOLD_MS;

        if (localSession && isExpiredOrExpiring) {
          const { data: refreshData, error: refreshError } = await Promise.race([
            supabase.auth.refreshSession(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Refresh timeout")), AUTH_OPERATION_TIMEOUT_MS)
            ),
          ]);

          if (!mounted) return;

          if (refreshError || !refreshData.session) {
            // Refresh token also expired (e.g. after ~7 days offline) — force re-login
            clearSessionAndRedirect();
            return;
          }

          // Refresh succeeded — update cache and proceed
          sessionRef.current = {
            expires_at: refreshData.session.expires_at,
            user_id: refreshData.session.user.id,
          };
          if (mounted) setReady(true);

          // Bootstrap default accounts once
          if (!bootstrapRanRef.current) {
            bootstrapRanRef.current = true;
            ensureDefaultAccounts(refreshData.session.user.id).then((r) => {
              if (!r.ok && typeof sessionStorage !== "undefined") {
                sessionStorage.setItem(BOOTSTRAP_FAILED_KEY, "1");
              }
            });
          }
          return;
        }

        // Step 3: No local session at all — verify with server
        if (!localSession) {
          const { data: { user }, error: userError } = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Auth timeout")), MAX_GATE_WAIT_MS)
            ),
          ]);

          if (!mounted) return;

          if (!user || userError) {
            clearSessionAndRedirect();
            return;
          }

          // getUser succeeded (unusual without session) — refresh to get tokens
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!mounted) return;

          if (refreshError || !refreshData.session) {
            clearSessionAndRedirect();
            return;
          }

          sessionRef.current = {
            expires_at: refreshData.session.expires_at,
            user_id: refreshData.session.user.id,
          };
          if (mounted) setReady(true);
          return;
        }

        // Step 4: Session exists and is not expiring — verify user is valid
        const { data: { user }, error: userError } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Auth timeout")), AUTH_OPERATION_TIMEOUT_MS)
          ),
        ]);

        if (!mounted) return;

        if (!user || userError) {
          clearSessionAndRedirect();
          return;
        }

        // Auth confirmed — cache session and ensure ready
        sessionRef.current = {
          expires_at: localSession.expires_at,
          user_id: user.id,
        };
        if (mounted) setReady(true);

        // Bootstrap default accounts once
        if (!bootstrapRanRef.current) {
          bootstrapRanRef.current = true;
          ensureDefaultAccounts(user.id).then((r) => {
            if (!r.ok && typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(BOOTSTRAP_FAILED_KEY, "1");
            }
          });
        }
      } catch {
        if (!mounted) return;
        // On timeout/error: if we already rendered optimistically, verify with getSession
        if (ready) {
          // We're already showing the page — try a lighter check
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              clearSessionAndRedirect();
            } else {
              sessionRef.current = {
                expires_at: session.expires_at,
                user_id: session.user.id,
              };
            }
          } catch {
            // Even getSession failed — network is down, keep showing cached page
          }
        } else {
          // Not rendered yet and auth failed — redirect to login
          clearSessionAndRedirect();
        }
      }
    }

    verifyAuth();

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SAFETY NET: if still not ready after MAX_GATE_WAIT_MS, force decision
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => {
      if (hasStoredSession()) {
        // Tokens exist but verification is slow — render optimistically
        setReady(true);
      } else {
        // No tokens — definitely not authenticated
        clearSessionAndRedirect();
      }
    }, MAX_GATE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  // On tab return: update activity timestamp AND re-verify session
  useEffect(() => {
    async function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      touchActivity();

      // Check if session expired while tab was hidden (overnight scenario)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const now = Date.now();
        const expiresAt = session?.expires_at;

        if (!session) {
          clearSessionAndRedirect();
          return;
        }

        // If token is expired or expiring, try to refresh
        if (!expiresAt || expiresAt * 1000 - now < REFRESH_THRESHOLD_MS) {
          const { data, error } = await Promise.race([
            supabase.auth.refreshSession(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Refresh timeout")), AUTH_OPERATION_TIMEOUT_MS)
            ),
          ]);

          if (error || !data.session) {
            clearSessionAndRedirect();
            return;
          }

          sessionRef.current = {
            expires_at: data.session.expires_at,
            user_id: data.session.user.id,
          };
        }
      } catch {
        // Network error on tab return — don't redirect, periodic check will retry
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Periodic session health check (every 5 min)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isInactive()) {
        clearSessionAndRedirect();
        return;
      }

      try {
        // Check local session first — if expired, refresh before hitting server
        const { data: { session } } = await supabase.auth.getSession();
        const now = Date.now();
        const expiresAt = session?.expires_at;
        const isExpiredOrExpiring = !expiresAt || expiresAt * 1000 - now < REFRESH_THRESHOLD_MS;

        if (session && isExpiredOrExpiring) {
          // Token expired or expiring — try refresh with timeout
          const { data, error } = await Promise.race([
            supabase.auth.refreshSession(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Refresh timeout")), AUTH_OPERATION_TIMEOUT_MS)
            ),
          ]);
          if (error || !data.session) {
            clearSessionAndRedirect();
            return;
          }
          sessionRef.current = {
            expires_at: data.session.expires_at,
            user_id: data.session.user.id,
          };
          return;
        }

        if (!session) {
          // No session at all — redirect
          clearSessionAndRedirect();
          return;
        }

        // Session valid — verify user with server (with timeout)
        const { data: { user }, error: userErr } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Auth timeout")), AUTH_OPERATION_TIMEOUT_MS)
          ),
        ]);
        if (!user || userErr) {
          clearSessionAndRedirect();
          return;
        }

        sessionRef.current = {
          expires_at: session.expires_at,
          user_id: user.id,
        };
      } catch {
        // Network error or timeout during periodic check — don't redirect, try again next interval
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
