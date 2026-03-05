"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/BrandMark";
import { LoginBackground } from "@/components/login/LoginBackground";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage } from "@/lib/profile";

const easeApple = [0.16, 1, 0.3, 1] as const;

type Mode = "signin" | "signup" | "magic";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
      <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
      <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const redirectToRef = useRef<"/app" | "/onboarding">("/app");

  useEffect(() => {
    if (!isExiting) return;
    const t = setTimeout(() => router.replace(redirectToRef.current), 150);
    return () => clearTimeout(t);
  }, [isExiting, router]);

  async function finishLogin() {
    try {
      const profile = await getMyProfile();
      redirectToRef.current = profile?.display_name?.trim() ? "/app" : "/onboarding";
    } catch {
      redirectToRef.current = "/onboarding";
    }
    setIsExiting(true);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err || !data.session) { setError(err?.message ?? "Falha ao entrar."); return; }
      await finishLogin();
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = signupName.trim();
    if (trimmedName.length < 2) { setError("Nome deve ter pelo menos 2 caracteres."); return; }
    if (!signupEmail.trim()) { setError("Informe um e-mail válido."); return; }
    if (signupPassword.length < 8) { setError("A senha deve ter no mínimo 8 caracteres."); return; }
    if (signupPassword !== signupConfirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { data, error: err } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: { emailRedirectTo: redirectTo, data: { display_name: trimmedName } },
      });
      if (err) { setError(err.message); return; }
      if (data.session) { await finishLogin(); } else { setInfo("Conta criada! Verifique seu e-mail."); }
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!magicEmail.trim()) { setError("Informe o e-mail."); return; }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: err } = await supabase.auth.signInWithOtp({
        email: magicEmail.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (err) { setError(err.message); return; }
      setInfo("Link enviado! Verifique seu e-mail.");
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) { setError(err.message); setLoading(false); }
    } catch (err) {
      setError(toFriendlyMessage(err));
      setLoading(false);
    }
  }

  function switchMode(m: Mode) { setMode(m); setError(null); setInfo(null); }

  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup";
  const isMagic = mode === "magic";

  return (
    <motion.div
      className="relative flex min-h-screen flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: easeApple }}
    >
      <LoginBackground className="z-0" />
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 bg-[#F5F5F7] dark:bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 1 : 0 }}
        transition={{ duration: 0.28, ease: easeApple }}
        aria-hidden
      />
      <motion.div
        className="relative z-10 mb-8 text-center px-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeApple }}
      >
        <BrandMark size="xl" />
        <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Suas notícias, seu journal, sua wallet,{" "}
          <span className="text-foreground font-medium">seu tudo.</span>
        </p>
      </motion.div>

      {!isExiting && (
        <div className="relative z-10 w-full max-w-[400px] px-4 pb-10">
          <div className="rounded-[22px] border border-border bg-card p-8 shadow-soft dark:shadow-soft-dark">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {isSignIn && "Entrar"}
              {isSignUp && "Criar conta"}
              {isMagic && "Link mágico"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignIn && "Acesse sua conta wealth.Investing."}
              {isSignUp && "Comece sua jornada no mercado."}
              {isMagic && "Receba um link de acesso no e-mail."}
            </p>

            {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
            {info && <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400" role="status">{info}</p>}

            {!isMagic && (
              <>
                <button type="button" onClick={handleGoogle} disabled={loading}
                  className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50">
                  <GoogleIcon />
                  Continuar com Google
                </button>
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              </>
            )}

            {isSignIn && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" className="input-ios" />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">Senha</label>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="input-ios" />
                </div>
                <Button type="submit" disabled={loading} className="w-full py-3 font-medium">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            )}

            {isSignUp && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-foreground">Nome</label>
                  <input id="signup-name" type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} required placeholder="Como quer ser chamado" className="input-ios" />
                </div>
                <div>
                  <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
                  <input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required placeholder="seu@email.com" className="input-ios" />
                </div>
                <div>
                  <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-foreground">Senha (min. 8 caracteres)</label>
                  <input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required placeholder="••••••••" className="input-ios" />
                </div>
                <div>
                  <label htmlFor="signup-confirm" className="mb-1.5 block text-sm font-medium text-foreground">Confirmar senha</label>
                  <input id="signup-confirm" type="password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} required placeholder="••••••••" className="input-ios" />
                </div>
                <Button type="submit" disabled={loading} className="w-full py-3 font-medium">
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            )}

            {isMagic && (
              <form onSubmit={handleMagicLink} className="mt-5 space-y-5">
                <div>
                  <label htmlFor="magic-email" className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
                  <input id="magic-email" type="email" value={magicEmail} onChange={(e) => setMagicEmail(e.target.value)} required placeholder="seu@email.com" className="input-ios" />
                </div>
                <Button type="submit" disabled={loading} className="w-full py-3 font-medium">
                  {loading ? "Enviando..." : "Enviar link"}
                </Button>
              </form>
            )}

            <div className="mt-5 flex flex-col items-center gap-2">
              {isSignIn && (
                <>
                  <button type="button" onClick={() => switchMode("magic")} className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                    Entrar com link magico
                  </button>
                  <button type="button" onClick={() => switchMode("signup")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Não tem conta? <span className="font-medium text-foreground hover:underline">Criar agora</span>
                  </button>
                </>
              )}
              {isSignUp && (
                <button type="button" onClick={() => switchMode("signin")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Já tem conta? <span className="font-medium text-foreground hover:underline">Entrar</span>
                </button>
              )}
              {isMagic && (
                <button type="button" onClick={() => switchMode("signin")} className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
                  Voltar para o login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
