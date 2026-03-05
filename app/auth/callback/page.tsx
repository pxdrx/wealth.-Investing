"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile } from "@/lib/profile";
import { ensureDefaultAccounts, BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function finishAuth() {
      try {
        const code = searchParams.get("code");
        const token_hash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) { setError(true); return; }
        } else if (token_hash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
          if (verifyError) { setError(true); return; }
        } else {
          // fallback: hash fragment (#access_token) — SDK processa automaticamente
          await new Promise((r) => setTimeout(r, 500));
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { setError(true); return; }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          ensureDefaultAccounts(session.user.id).then((r) => {
            if (!r.ok && typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(BOOTSTRAP_FAILED_KEY, "1");
            }
          });
        }

        const profile = await getMyProfile();
        if (!profile?.display_name?.trim()) {
          router.replace("/onboarding");
        } else {
          router.replace("/app");
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[auth/callback] finishAuth error", err);
        }
        setError(true);
      }
    }

    finishAuth();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
        <p className="text-center text-muted-foreground">
          Não foi possível concluir o login.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6">
      <p className="text-muted-foreground">Autenticando…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6">
          <p className="text-muted-foreground">Autenticando…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
