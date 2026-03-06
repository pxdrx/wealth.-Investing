"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand/BrandMark";
import { LoginBackground } from "@/components/login/LoginBackground";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage, upsertMyProfileDisplayName } from "@/lib/profile";

const easeApple = [0.16, 1, 0.3, 1] as const;
const MIN_LENGTH = 2;
const MAX_LENGTH = 20;

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function gate() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace("/login?from=" + encodeURIComponent("/onboarding")); return; }
        const profile = await getMyProfile();
        if (profile?.display_name?.trim()) { router.replace("/app"); return; }
      } catch (err) {
        setError(toFriendlyMessage(err));
      } finally {
        setChecking(false);
      }
    }
    gate();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = displayName.trim();
    if (trimmed.length < MIN_LENGTH) { setError(`Mínimo ${MIN_LENGTH} caracteres.`); return; }
    if (trimmed.length > MAX_LENGTH) { setError(`Máximo ${MAX_LENGTH} caracteres.`); return; }
    setLoading(true);
    try {
      const result = await upsertMyProfileDisplayName(trimmed);
      if (result.error) { setError(result.error.message); return; }
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const isValid = displayName.trim().length >= MIN_LENGTH;

  if (checking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <LoginBackground className="z-0" />
        <p className="relative z-10 text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="relative flex min-h-screen flex-col items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: easeApple }}
    >
      <LoginBackground className="z-0" />

      {/* Brand */}
      <motion.div
        className="relative z-10 mb-8 text-center"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeApple }}
      >
        <BrandMark size="xl" />
      </motion.div>

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-[400px] pb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: easeApple }}
      >
        <div className="rounded-[22px] border border-border bg-card p-8 shadow-soft dark:shadow-soft-dark">

          {/* Step dots */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1.5 w-6 rounded-full bg-foreground" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-1">
            Bem-vindo ao wealth.Investing
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight mb-6">
            Como quer ser<br />chamado?
          </h1>

          {error && (
            <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Seu nome de exibição
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Pedro"
              maxLength={MAX_LENGTH}
              autoComplete="nickname"
              autoFocus
              className="input-ios text-base"
            />
            <p className="text-xs text-muted-foreground pb-4">
              Mínimo {MIN_LENGTH} caracteres. Pode alterar depois em Configurações.
            </p>
            <button
              type="submit"
              disabled={loading || !isValid}
              className={[
                "w-full rounded-[14px] py-3.5 text-sm font-semibold transition-all duration-200",
                isValid && !loading
                  ? "bg-foreground text-background hover:opacity-90 cursor-pointer"
                  : "bg-foreground/20 text-foreground/40 cursor-not-allowed",
              ].join(" ")}
            >
              {loading ? "Salvando..." : "Começar →"}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
