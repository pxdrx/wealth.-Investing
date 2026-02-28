"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { setAuth } from "@/lib/auth";
import { LoginBackground } from "@/components/login/LoginBackground";

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
  const isExitingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  function handleExitComplete() {
    if (isExitingRef.current) {
      router.push("/app");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 480));
    setAuth();
    setLoading(false);
    isExitingRef.current = true;
    setIsExiting(true);
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
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(120,119,198,0.4), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2]"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 80% 20%, rgba(147,197,253,0.35), transparent 50%)",
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
          <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] md:text-3xl">
            Trading Dashboard
          </h2>
          <p className="mt-3 text-sm text-[#6e6e73] md:text-base">
            Acompanhe alertas, watchlist e decisões em um só lugar.
          </p>
        </motion.div>
      </motion.div>

      {/* Form side + overlay */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 md:py-16">
        {/* Glow fixo atrás do card — blur estático, opacidade baixa */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[320px] w-[min(100%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.42] dark:opacity-[0.2]"
          style={{
            background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(180,200,255,0.5), transparent 65%)",
            filter: "blur(32px)",
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
                className="rounded-[22px] border border-[#d2d2d7] bg-white p-8 transition-shadow duration-200 dark:border-border dark:bg-card md:hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)]"
                style={{
                  boxShadow: "0 4px 24px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)",
                }}
                whileHover={reducedMotion ? undefined : { y: -2 }}
                transition={{ duration: 0.2, ease: easeApple }}
              >
                <h1 className="text-xl font-semibold tracking-tight text-[#1d1d1f] dark:text-foreground">
                  Entrar
                </h1>
                <p className="mt-1 text-sm text-[#6e6e73] dark:text-muted-foreground">
                  Use seu e-mail para acessar o dashboard.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-[#1d1d1f] dark:text-foreground"
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
                      className="mb-1.5 block text-sm font-medium text-[#1d1d1f] dark:text-foreground"
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
                    className="relative w-full overflow-hidden rounded-xl bg-[#0071e3] py-3 font-medium text-white hover:bg-[#0077ed] focus:ring-[#0071e3]"
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

                <p className="mt-6 text-center">
                  <Link
                    href="/"
                    className="text-sm font-medium text-[#0071e3] hover:underline"
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
