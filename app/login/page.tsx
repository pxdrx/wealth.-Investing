"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/BrandMark";
import { LoginBackground } from "@/components/login/LoginBackground";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage } from "@/lib/profile";

const easeApple = [0.16, 1, 0.3, 1] as const;
const DURATION_PAGE = 0.45;
const DURATION_CARD = 0.5;
const DURATION_EXIT = 0.28;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: (reduced: boolean) => ({
    opacity: 1,
    transition: {
      duration: reduced ? 0.06 : DURATION_PAGE,
      ease: easeApple,
    },
  }),
};

const panelVariants = {
  initial: { opacity: 0 },
  animate: (reduced: boolean) => ({
    opacity: 1,
    transition: {
      duration: reduced ? 0.06 : DURATION_PAGE,
      ease: easeApple,
    },
  }),
};

const panelContentVariants = {
  initial: (reduced: boolean) => ({ opacity: 0, ...(reduced ? {} : { y: 8 }) }),
  animate: (reduced: boolean) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: reduced ? 0 : 0.1,
      duration: reduced ? 0.06 : DURATION_PAGE,
      ease: easeApple,
    },
  }),
};

const cardVariants = {
  initial: (reduced: boolean) =>
    reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 },
  animate: (reduced: boolean) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: reduced ? 0.08 : DURATION_CARD,
      ease: easeApple,
    },
  }),
  exit: (reduced: boolean) => ({
    opacity: 0,
    scale: 0.99,
    y: 0,
    transition: {
      duration: reduced ? 0.04 : DURATION_EXIT,
      ease: easeApple,
    },
  }),
};

export default function LoginPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const redirectToRef = useRef<"/app" | "/onboarding">("/app");

  function handleExitComplete() {
    router.replace(redirectToRef.current);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (process.env.NODE_ENV === "development") {
        console.debug("[login] signInWithPassword start");
      }
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (process.env.NODE_ENV === "development") {
        console.debug("[login] signInWithPassword result", err ? { error: err.message } : "ok");
      }
      if (err || !data.session) {
        setError(err?.message ?? "Falha ao entrar.");
        return;
      }
      const profile = await getMyProfile();
      if (process.env.NODE_ENV === "development") {
        console.debug("[login] getMyProfile done, redirect:", profile?.display_name?.trim() ? "/app" : "/onboarding");
      }
      redirectToRef.current = profile?.display_name?.trim() ? "/app" : "/onboarding";
      setIsExiting(true);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[login] handleSubmit error", err);
      }
      setError(toFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    if (!email.trim()) {
      setError("Informe o e-mail para enviar o link.");
      return;
    }
    setLoading(true);
    try {
      if (process.env.NODE_ENV === "development") {
        console.debug("[login] signInWithOtp start");
      }
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`;
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (process.env.NODE_ENV === "development") {
        console.debug("[login] signInWithOtp result", err ? { error: err.message } : "ok");
      }
      if (err) {
        setError(err.message);
        return;
      }
      setMagicLinkSent(true);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[login] handleMagicLink error", err);
      }
      setError(toFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="relative flex min-h-[calc(100vh-4rem)] flex-col md:flex-row"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      custom={reducedMotion}
      style={{
        willChange: reducedMotion ? "auto" : "opacity",
      }}
    >
      <LoginBackground className="z-0" />

      {/* Brand panel — static glow */}
      <motion.div
        className="relative z-10 flex min-h-[220px] flex-1 items-center justify-center overflow-hidden md:min-h-full md:flex-[0.45]"
        variants={panelVariants}
        initial="initial"
        animate="animate"
        custom={reducedMotion}
        style={{ willChange: reducedMotion ? "auto" : "opacity" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,0,0,0.02), transparent 60%)",
          }}
        />
        <motion.div
          className="relative z-10 px-8 text-center md:px-12"
          variants={panelContentVariants}
          initial="initial"
          animate="animate"
          custom={reducedMotion}
          style={{ willChange: reducedMotion ? "auto" : "transform, opacity" }}
        >
          <BrandMark size="xl" className="leading-tight-apple" />
          <p className="mt-2 text-lg leading-relaxed-apple">
            <span className="text-muted-foreground">Suas notícias, seu journal, sua wallet, </span>
            <span className="text-foreground">seu tudo.</span>
          </p>
        </motion.div>
      </motion.div>

      {/* Form side + overlay */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 md:py-16">
        {/* Sombra suave atrás do card — neutra, profundidade sutil */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[320px] w-[min(100%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.25] dark:opacity-[0.12]"
          style={{
            background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(0,0,0,0.06), transparent 65%)",
            filter: "blur(24px)",
          }}
          aria-hidden
        />

        {/* Exit overlay — fades in during exit, no blur */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 bg-[#F5F5F7] dark:bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: isExiting ? 1 : 0 }}
          transition={{
            duration: reducedMotion ? 0.05 : DURATION_EXIT,
            ease: easeApple,
          }}
          style={{ willChange: reducedMotion ? "auto" : "opacity" }}
          aria-hidden
        />

        <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
          {!isExiting && (
            <motion.div
              key="login-card"
              className="relative z-10 w-full max-w-[400px]"
              variants={cardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              custom={reducedMotion}
              style={{
                willChange: reducedMotion ? "auto" : "transform, opacity",
              }}
            >
              <motion.div
                className="rounded-card border border-border bg-card p-8 shadow-soft dark:shadow-soft-dark transition-shadow duration-200 md:hover:shadow-soft"
                whileHover={reducedMotion ? undefined : { y: -2 }}
                transition={{ duration: 0.2, ease: easeApple }}
              >
                <h1 className="text-xl font-semibold tracking-tight-apple leading-snug-apple text-foreground">
                  Entrar
                </h1>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed-apple">
                  Use seu e-mail e senha para acessar.
                </p>

                {error && (
                  <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                {magicLinkSent && (
                  <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400" role="status">
                    Link enviado. Verifique seu e-mail.
                  </p>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      E-mail
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="input-ios transition-[border-color,box-shadow] duration-150"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Senha
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="input-ios transition-[border-color,box-shadow] duration-150"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="relative w-full overflow-hidden py-3 font-medium"
                  >
                    {loading && (
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{
                          repeat: Infinity,
                          repeatDelay: 0.6,
                          duration: 1.2,
                          ease: "easeInOut",
                        }}
                        aria-hidden
                      />
                    )}
                    {loading ? (
                      <span className="relative flex items-center justify-center gap-2">
                        <motion.span
                          animate={
                            reducedMotion ? {} : { rotate: 360 }
                          }
                          transition={
                            reducedMotion
                              ? {}
                              : {
                                  repeat: Infinity,
                                  duration: 0.7,
                                  ease: "linear",
                                }
                          }
                          className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                        />
                        Entrando…
                      </span>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleMagicLink}
                    disabled={loading}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors disabled:opacity-50"
                  >
                    Ou enviar link mágico por e-mail
                  </button>
                </p>

                <p className="mt-6 text-center">
                  <Link
                    href="/"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    ← Voltar para home
                  </Link>
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
