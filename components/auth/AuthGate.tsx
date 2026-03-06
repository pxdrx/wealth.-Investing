"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setReady(true);
      ensureDefaultAccounts(session.user.id).then((r) => {
        if (!r.ok && typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(BOOTSTRAP_FAILED_KEY, "1");
        }
      });
    });

    return () => { mounted = false; };
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
