"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand/BrandMark";
import { supabase } from "@/lib/supabase/client";
import { toFriendlyMessage } from "@/lib/profile";
import type { EmailOtpType } from "@supabase/supabase-js";

const easeApple = [0.16, 1, 0.3, 1] as const;

type Status = "loading" | "ready" | "invalid" | "submitting";

export default function ResetPasswordPage() {
  const hasRun = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function verify() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      try {
        if (code) {
          const { error: err } = await supabase.auth.exchangeCodeForSession(code);
          if (err) throw err;
        } else if (tokenHash && type) {
          const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
          if (err) throw err;
        } else {
          await new Promise((r) => setTimeout(r, 500));
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sessão não encontrada");
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error("Sessão não encontrada");
        setStatus("ready");
      } catch (err) {
        console.error("[reset-password]", err);
        setStatus("invalid");
      }
    }

    verify();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("A senha deve ter no mínimo 8 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setStatus("submitting");
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); setStatus("ready"); return; }
      // Clear recovery session so user logs in fresh with new password
      try {
        const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "";
        localStorage.removeItem(`sb-${projectRef}-auth-token`);
        sessionStorage.clear();
      } catch {}
      window.location.href = "/login?info=password-updated";
    } catch (err) {
      setError(toFriendlyMessage(err));
      setStatus("ready");
    }
  }

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans p-6 md:p-12"
      style={{ backgroundColor: "hsl(var(--background))" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: easeApple }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <BrandMark size="lg" />
        </div>

        <motion.div
          className="bg-card p-8 md:p-10 rounded-[24px] shadow-[0px_12px_48px_rgba(26,26,26,0.04)] border border-border/40"
          style={{ backgroundColor: "hsl(var(--card))" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: easeApple }}
        >
          {status === "loading" && (
            <p className="text-center text-muted-foreground text-sm py-8">Verificando link...</p>
          )}

          {status === "invalid" && (
            <div className="space-y-5 text-center py-4">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">Link inválido ou expirado</h1>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Este link de redefinição não é válido ou já foi usado. Solicite um novo.
              </p>
              <a href="/login" className="inline-block w-full h-12 bg-primary text-primary-foreground text-[14px] font-semibold rounded-full hover:bg-primary/90 transition-all leading-[3rem]">
                Voltar para login
              </a>
            </div>
          )}

          {(status === "ready" || status === "submitting") && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">Criar nova senha</h1>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  Escolha uma senha forte com no mínimo 8 caracteres.
                </p>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-[13px] text-red-600 font-medium" role="alert">
                  {error}
                </p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">Nova senha</label>
                <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" autoComplete="new-password"
                  className="w-full h-12 px-4 bg-muted/50 border border-border rounded-[14px] focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all outline-none text-foreground placeholder:text-muted-foreground/60 text-sm" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">Confirmar senha</label>
                <input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="••••••••" autoComplete="new-password"
                  className="w-full h-12 px-4 bg-muted/50 border border-border rounded-[14px] focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all outline-none text-foreground placeholder:text-muted-foreground/60 text-sm" />
              </div>

              <button type="submit" disabled={status === "submitting"} className="w-full h-12 mt-2 bg-primary text-primary-foreground text-[14px] font-semibold rounded-full hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                {status === "submitting" ? "Atualizando..." : "Atualizar senha"}
              </button>

              <a href="/login" className="block text-center w-full text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                ← Voltar para entrar
              </a>
            </form>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
