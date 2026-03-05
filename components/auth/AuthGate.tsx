"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage } from "@/lib/profile";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

function runBootstrapInBackground(userId: string) {
  ensureDefaultAccounts(userId).then((result) => {
    if (!result.ok && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(BOOTSTRAP_FAILED_KEY, "1");
    }
  });
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          const from = pathname ?? "/app";
          router.replace(`/login?from=${encodeURIComponent(from)}`);
          return;
        }

        // Retry com backoff — trigger de profiles pode ainda estar executando
        let profile = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            profile = await getMyProfile();
            if (profile?.display_name?.trim()) break;
          } catch {
            // ignora erro temporário
          }
          await new Promise((r) => setTimeout(r, attempt * 300));
        }

        if (!cancelled) {
          if (!profile?.display_name?.trim()) {
            router.replace("/onboarding");
            return;
          }
          setReady(true);
          runBootstrapInBackground(data.session.user.id);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[AuthGate] session error", err);
        }
        if (!cancelled) {
          setError(toFriendlyMessage(err));
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
        <div className="max-w-md text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            Não foi possível carregar sua sessão.
          </p>
          <p className="text-sm text-muted-foreground">
            {error}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-primary hover:underline"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
