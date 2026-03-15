"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

/** Five minutes in milliseconds */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<{ expires_at?: number; user_id?: string } | null>(null);
  const retriesRef = useRef(0);
  const bootstrapRanRef = useRef(false);
  const pathname = usePathname();

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

        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session) {
          if (!sessionRef.current) {
            window.location.href = "/login";
          }
          return;
        }

        // Cache current session and show content immediately
        sessionRef.current = {
          expires_at: session.expires_at,
          user_id: session.user.id,
        };
        retriesRef.current = 0;
        if (mounted) setReady(true);

        // Refresh token in background if expiring soon (non-blocking, no redirect on failure)
        const expiresAt = session.expires_at;
        if (expiresAt && expiresAt * 1000 - Date.now() < REFRESH_THRESHOLD_MS) {
          supabase.auth.refreshSession().then(({ data }) => {
            if (!mounted || !data.session) return;
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
        } else if (!sessionRef.current) {
          window.location.href = "/login";
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
          window.location.href = "/login";
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
