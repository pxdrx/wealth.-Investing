"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

/** Five minutes in milliseconds */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/** Eight hours inactivity timeout */
const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000;

/** Periodic session check interval (5 minutes) */
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** Throttle interval for activity tracking writes (60 seconds) */
const ACTIVITY_THROTTLE_MS = 60 * 1000;

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

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<{ expires_at?: number; user_id?: string } | null>(null);
  const retriesRef = useRef(0);
  const bootstrapRanRef = useRef(false);
  const lastActivityWriteRef = useRef(0);
  const pathname = usePathname();

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
    // Initialize activity timestamp on mount
    touchActivity();

    const events: Array<keyof WindowEventMap> = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [handleActivity]);

  // Main auth gate effect — runs on pathname change
  useEffect(() => {
    let mounted = true;

    async function gate() {
      try {
        // Check inactivity timeout first
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

        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session) {
          // No session at all — redirect to login
          clearSessionAndRedirect();
          return;
        }

        // Cache current session and show content immediately
        sessionRef.current = {
          expires_at: session.expires_at,
          user_id: session.user.id,
        };
        retriesRef.current = 0;
        if (mounted) setReady(true);

        // Refresh token in background if expiring soon
        const expiresAt = session.expires_at;
        if (expiresAt && expiresAt * 1000 - Date.now() < REFRESH_THRESHOLD_MS) {
          supabase.auth.refreshSession().then(({ data, error }) => {
            if (!mounted) return;
            if (error || !data.session) {
              // Refresh failed — session is dead, redirect to login
              clearSessionAndRedirect();
              return;
            }
            sessionRef.current = {
              expires_at: data.session.expires_at,
              user_id: data.session.user.id,
            };
          });
        }

        // Only run bootstrap once per session
        if (!bootstrapRanRef.current) {
          bootstrapRanRef.current = true;
          ensureDefaultAccounts(session.user.id).then((r) => {
            if (!r.ok && typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(BOOTSTRAP_FAILED_KEY, "1");
            }
          });
        }
      } catch {
        // On error, retry up to 2 times before redirecting
        if (!mounted) return;
        retriesRef.current += 1;
        if (retriesRef.current < 3) {
          setTimeout(() => { if (mounted) gate(); }, 1000);
        } else {
          clearSessionAndRedirect();
        }
      }
    }

    gate();

    // Only redirect on explicit SIGNED_OUT — ignore transient session nulls
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (!mounted) return;
        if (event === "SIGNED_OUT") {
          sessionRef.current = null;
          clearSessionAndRedirect();
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [pathname]);

  // Periodic session health check (every 5 min)
  useEffect(() => {
    const interval = setInterval(async () => {
      // Check inactivity
      if (isInactive()) {
        clearSessionAndRedirect();
        return;
      }

      // Verify session is still valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        clearSessionAndRedirect();
        return;
      }

      // Proactively refresh if expiring soon
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 - Date.now() < REFRESH_THRESHOLD_MS) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          clearSessionAndRedirect();
          return;
        }
        sessionRef.current = {
          expires_at: data.session.expires_at,
          user_id: data.session.user.id,
        };
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
