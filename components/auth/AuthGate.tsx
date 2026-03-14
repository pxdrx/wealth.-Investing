"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

/** Five minutes in milliseconds */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

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
            setReady(true);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session) {
          window.location.href = "/login";
          return;
        }

        // Check token expiration and refresh if within threshold
        const expiresAt = session.expires_at;
        if (expiresAt && expiresAt * 1000 - Date.now() < REFRESH_THRESHOLD_MS) {
          const { data, error } = await supabase.auth.refreshSession();
          if (!mounted) return;
          if (error || !data.session) {
            window.location.href = "/login";
            return;
          }
          // Cache refreshed session
          sessionRef.current = {
            expires_at: data.session.expires_at,
            user_id: data.session.user.id,
          };
        } else {
          // Cache current session
          sessionRef.current = {
            expires_at: session.expires_at,
            user_id: session.user.id,
          };
        }

        setReady(true);

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
