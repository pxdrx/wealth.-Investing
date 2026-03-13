"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    async function gate() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session) {
          window.location.href = "/login";
          return;
        }

        // Check token expiration and refresh if needed
        const expiresAt = session.expires_at;
        if (expiresAt && expiresAt * 1000 < Date.now()) {
          const { data, error } = await supabase.auth.refreshSession();
          if (!mounted) return;
          if (error || !data.session) {
            window.location.href = "/login";
            return;
          }
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
