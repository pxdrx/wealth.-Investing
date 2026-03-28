"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function handle() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      const next = url.searchParams.get("next") ?? "/app";

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
          if (error) throw error;
        } else {
          // Fallback: aguarda hash fragment ser processado pelo SDK
          await new Promise((r) => setTimeout(r, 500));
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sessao nao encontrada");
        }

        // Verifica se precisa de onboarding
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error("Sessão não encontrada após autenticação");

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", session.user.id)
          .maybeSingle();

        // Validate redirect to prevent open redirect attacks
        const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";

        if (!profile?.display_name?.trim()) {
          window.location.href = "/onboarding";
        } else {
          window.location.href = safeNext;
        }
      } catch (err) {
        console.error("[auth/callback]", err);
        window.location.href = "/login?error=callback";
      }
    }

    handle();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Autenticando...</p>
    </div>
  );
}
