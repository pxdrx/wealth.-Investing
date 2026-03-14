"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

/** Five minutes in milliseconds */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
/** Timeout for auth operations to prevent infinite hang */
const AUTH_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Auth timeout")), ms)
    ),
  ]);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<{ expires_at?: number; user_id?: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function gate() {
      try {
        // Use cached session if token is not expiring soon
        if (sessionRef.current?.expires_at) {
          const msUntilExpiry = sessionRef.current.expires_at * 1000 - Date.now();
          if (msUntilExpiry > REFRESH_THRESHOLD_MS) {
            if (mounted) setReady(true);
            return;
          }
        }

        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS
        );

        if (!mounted) return;

        if (!session) {
          window.location.href = "/login";
          return;
        }

        // Cache current session immediately — only refresh if truly needed
        sessionRef.current = {
          expires_at: session.expires_at,
          user_id: session.user.id,
        };
        setReady(true);

        // Refresh token in background if expiring soon (non-blocking)
        const expiresAt = session.expires_at;
        if (expiresAt && expiresAt * 1000 - Date.now() < REFRESH_THRESHOLD_MS) {
          supabase.auth.refreshSession().then(({ data, error }) => {
            if (!mounted) return;
            if (error || !data.session) {
              window.location.href = "/login";
              return;
            }
            sessionRef.current = {
              expires_at: data.session.expires_at,
              user_id: data.session.user.id,
            };
          });
        }

        ensureDefaultAccounts(session.user.id).then((r) => {
          if (!r.ok && typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(BOOTSTRAP_FAILED_KEY, "1");
          }
        });
      } catch {
        if (mounted) window.location.href = "/login";
      }
    }

    gate();

    // Listen for auth state changes (logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_OUT" || !session) {
          window.location.href = "/login";
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
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
