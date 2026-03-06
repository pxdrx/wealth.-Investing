"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/BrandMark";
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
        if (!session) {
          router.replace("/login?from=" + encodeURIComponent("/onboarding"));
          return;
        }
        const profile = await getMyProfile();
        if (profile?.display_name?.trim()) {
          router.replace("/app");
          return;
        }
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
    if (trimmed.length < MIN_LENGTH) {
      setError(`Mínimo ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Máximo ${MAX_LENGTH} caracteres.`);
      return;
    }
    setLoading(true);
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[onboarding] submit: salvando apelido");
      }
      const result = await upsertMyProfileDisplayName(trimmed);
      if (process.env.NODE_ENV === "development") {
        console.log("[onboarding] submit: resposta", result.error ? { error: result.error.message } : "ok");
      }
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (process.env.NODE_ENV === "development") {
        console.log("[onboarding] submit: redirecionando para /app");
      }
      window.location.href = "/app";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao salvar. Tente novamente.";
      if (process.env.NODE_ENV === "development") {
        console.warn("[onboarding] submit: exceção", err);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-12 bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: easeApple }}
    >
      <motion.div
        className="w-full max-w-[400px]"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: easeApple }}
      >
        <div className="mb-8 flex justify-center">
          <BrandMark size="xl" />
        </div>
        <div className="rounded-card border border-border bg-card p-8 shadow-soft dark:shadow-soft-dark">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Como podemos te chamar?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Isso aparece no topo do seu painel.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-foreground">
                Apelido
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome ou apelido"
                maxLength={MAX_LENGTH}
                autoComplete="nickname"
                className="input-ios transition-[border-color,box-shadow] duration-150"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {displayName.length}/{MAX_LENGTH}
              </p>
            </div>
            <Button
              type="submit"
              disabled={loading || displayName.trim().length < MIN_LENGTH}
              className="w-full py-3 font-medium"
            >
              {loading ? "Salvando..." : "Continuar"}
            </Button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
