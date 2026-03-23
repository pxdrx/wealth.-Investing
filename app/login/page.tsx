"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BrandMark } from "@/components/brand/BrandMark";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage } from "@/lib/profile";

const easeApple = [0.16, 1, 0.3, 1] as const;
type Mode = "signin" | "signup" | "magic";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
      <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
      <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
    </svg>
  );
}

const MODES: { key: Mode; label: string }[] = [
  { key: "signin", label: "Entrar" },
  { key: "signup", label: "Criar conta" },
  { key: "magic",  label: "Link mágico" },
];

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

  const callbackError = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("error")
    : null;

  useEffect(() => {
    if (!isExiting) return;
    const t = setTimeout(() => router.replace(redirectToRef.current), 150);
    return () => clearTimeout(t);
  }, [isExiting, router]);

  async function finishLogin() {
    try {
      const profile = await getMyProfile();
      redirectToRef.current = profile?.display_name?.trim() ? "/app" : "/onboarding";
    } catch { redirectToRef.current = "/onboarding"; }
    setIsExiting(true);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err || !data.session) { setError(err?.message ?? "Falha ao entrar."); return; }
      await finishLogin();
    } catch (err) { setError(toFriendlyMessage(err)); }
    finally { setLoading(false); }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const name = signupName.trim();
    if (name.length < 2) { setError("Nome deve ter pelo menos 2 caracteres."); return; }
    if (!signupEmail.trim()) { setError("Informe um e-mail válido."); return; }
    if (signupPassword.length < 8) { setError("A senha deve ter no mínimo 8 caracteres."); return; }
    if (signupPassword !== signupConfirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: signupEmail.trim(), password: signupPassword,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { display_name: name } },
      });
      if (err) { setError(err.message); return; }
      if (data.session) { await finishLogin(); } else { setInfo("Conta criada! Verifique seu e-mail."); }
    } catch (err) { setError(toFriendlyMessage(err)); }
    finally { setLoading(false); }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!magicEmail.trim()) { setError("Informe o e-mail."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: magicEmail.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) { setError(err.message); return; }
      setInfo("Link enviado! Verifique seu e-mail.");
    } catch (err) { setError(toFriendlyMessage(err)); }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError(null); setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) { setError(err.message); setLoading(false); }
    } catch (err) { setError(toFriendlyMessage(err)); setLoading(false); }
  }

  function switchMode(m: Mode) { setMode(m); setError(null); setInfo(null); }

  return (
    <motion.div
      className="min-h-screen flex flex-col md:flex-row bg-[#F7F6F3] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A]/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: easeApple }}
    >
      {/* Fade out overlay on exit */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-50 bg-[#F7F6F3]"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 1 : 0 }}
        transition={{ duration: 0.28, ease: easeApple }}
        aria-hidden
      />

      {/* Top Navigation (Mobile Only) */}
      <nav className="md:hidden fixed top-0 w-full z-40 bg-[#F7F6F3]/80 backdrop-blur-md px-6 h-16 flex items-center border-b border-[#D4D2CB]/30">
        <BrandMark size="base" />
      </nav>

      {/* Left Side: Editorial Content */}
      <section 
        className="hidden md:flex flex-1 flex-col justify-center p-12 lg:p-24 relative overflow-hidden" 
        style={{ backgroundImage: "radial-gradient(#D4D2CB 1px, transparent 0)", backgroundSize: "24px 24px" }}
      >
        <div className="absolute top-10 left-12 lg:left-24">
          <BrandMark size="lg" />
        </div>

        <div className="max-w-xl z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: easeApple }}
          >
            <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 bg-white/50 backdrop-blur border border-[#D4D2CB]/60 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse cursor-help" title="Sistema online e operacional"></span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">Terminal Pro</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold text-[#1A1A1A] leading-[1.05] mb-6 tracking-tight">
              Tenha clareza total sobre cada operação
            </h1>
            <p className="text-lg text-[#6B6B6B] leading-relaxed max-w-md">
              Gerencie sua carteira com precisão. Uma interface limpa, desenhada para decisões rápidas e insights automatizados pelo AI Coach.
            </p>

            <div className="mt-16 grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-2">
                <span className="font-bold text-2xl text-[#1A1A1A]">Smart</span>
                <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Métricas &amp; Journaling</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-bold text-2xl text-[#1A1A1A]">Ao vivo</span>
                <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">Inteligência Macro</p>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Soft elegant background shape */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-[#1A1A1A]/5 rounded-full blur-[120px] pointer-events-none"></div>
      </section>

      {/* Right Side: Login Form */}
      <section className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 z-10 pt-24 md:pt-12">
        <div className="w-full max-w-[420px]">
          <div className="md:hidden mb-8 text-center px-2">
            <h2 className="text-3xl font-extrabold text-[#1A1A1A] mb-2 tracking-tight">Acessar Terminal</h2>
            <p className="text-[#6B6B6B] text-sm">Insira suas credenciais de acesso</p>
          </div>

          <motion.div 
            className="bg-white p-8 md:p-10 rounded-[24px] shadow-[0px_12px_48px_rgba(26,26,26,0.04)] border border-[#D4D2CB]/40 relative overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: easeApple }}
          >
            {/* Tab bar */}
            <div className="flex items-center gap-1 rounded-full bg-[#F7F6F3] p-1.5 mb-8 border border-[#D4D2CB]/30">
              {MODES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchMode(key)}
                  className={[
                    "flex-1 rounded-full py-2 text-xs font-semibold transition-all duration-300 relative z-10",
                    mode === key
                      ? "text-[#1A1A1A] shadow-[0px_2px_8px_rgba(0,0,0,0.06)] bg-white"
                      : "text-[#6B6B6B] hover:text-[#1A1A1A]",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Feedback messages */}
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5 overflow-hidden">
                <p className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-[13px] text-red-600 font-medium" role="alert">
                  {error}
                </p>
              </motion.div>
            )}
            {info && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5 overflow-hidden">
                <p className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-[13px] text-emerald-700 font-medium" role="status">
                  {info}
                </p>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25, ease: easeApple }}
              >
                {/* Google Button */}
                {mode !== "magic" && (
                  <>
                    <button type="button" onClick={handleGoogle} disabled={loading}
                      className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-[#D4D2CB] bg-white py-3.5 text-[14px] font-semibold text-[#1A1A1A] transition-all hover:bg-[#F7F6F3] disabled:opacity-50 active:scale-[0.98]">
                      <GoogleIcon />
                      Continuar com Google
                    </button>
                    <div className="my-6 relative flex items-center">
                      <div className="w-full border-t border-[#D4D2CB]"></div>
                      <div className="absolute left-1/2 -translate-x-1/2 bg-white px-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-widest">ou</div>
                    </div>
                  </>
                )}

                {/* SIGNIN FORM */}
                {mode === "signin" && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="signin-email" className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider ml-1">E-mail</label>
                      <input id="signin-email"
                        type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" 
                        className="w-full h-12 px-4 bg-[#F7F6F3]/50 border border-[#D4D2CB] rounded-[14px] focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] transition-all outline-none text-[#1A1A1A] placeholder:text-[#6B6B6B]/60 text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label htmlFor="signin-password" className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Senha</label>
                        <a href="#" className="text-[11px] font-bold text-[#1A1A1A] hover:underline" onClick={(e) => { e.preventDefault(); setError("A recuperar senha ainda não foi implementada neste demo."); }}>Esqueceu a senha?</a>
                      </div>
                      <input id="signin-password"
                        type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" 
                        className="w-full h-12 px-4 bg-[#F7F6F3]/50 border border-[#D4D2CB] rounded-[14px] focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] transition-all outline-none text-[#1A1A1A] placeholder:text-[#6B6B6B]/60 text-sm" 
                      />
                    </div>
                    <button type="submit" disabled={loading} className="w-full h-12 mt-2 bg-[#1A1A1A] text-white text-[14px] font-semibold rounded-full hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                      {loading ? "Acessando..." : "Entrar no Terminal"}
                    </button>
                  </form>
                )}

                {/* SIGNUP FORM */}
                {mode === "signup" && (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="signup-name" className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider ml-1">Nome</label>
                      <input id="signup-name"
                        type="text" value={signupName} onChange={e => setSignupName(e.target.value)} required placeholder="Como quer ser chamado" 
                        className="w-full h-12 px-4 bg-[#F7F6F3]/50 border border-[#D4D2CB] rounded-[14px] focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] transition-all outline-none text-[#1A1A1A] placeholder:text-[#6B6B6B]/60 text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="signup-email" className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider ml-1">E-mail</label>
                      <input id="signup-email"
                        type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required placeholder="seu@email.com" 
                        className="w-full h-12 px-4 bg-[#F7F6F3]/50 border border-[#D4D2CB] rounded-[14px] focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] transition-all outline-none text-[#1A1A1A] placeholder:text-[#6B6B6B]/60 text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="signup-password" className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider ml-1">Senha <span className="text-[#6B6B6B]/70 normal-case tracking-normal">(mín. 8)</span></label>
                      <input id="signup-password"
                        type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required placeholder="••••••••" 
                        className="w-full h-12 px-4 bg-[#F7F6F3]/50 border border-[#D4D2CB] rounded-[14px] focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] transition-all outline-none text-[#1A1A1A] placeholder:text-[#6B6B6B]/60 text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="signup-confirm" className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider ml-1">Confirmar senha</label>
                      <input id="signup-confirm"
                        type="password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} required placeholder="••••••••" 
                        className="w-full h-12 px-4 bg-[#F7F6F3]/50 border border-[#D4D2CB] rounded-[14px] focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] transition-all outline-none text-[#1A1A1A] placeholder:text-[#6B6B6B]/60 text-sm" 
                      />
                    </div>
                    <button type="submit" disabled={loading} className="w-full h-12 mt-2 bg-[#1A1A1A] text-white text-[14px] font-semibold rounded-full hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                      {loading ? "Criando conta..." : "Criar conta"}
                    </button>
                  </form>
                )}

                {/* MAGIC LINK FORM */}
                {mode === "magic" && (
                  <form onSubmit={handleMagicLink} className="space-y-5">
                    <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
                      Digite seu e-mail para receber um link de acesso instantâneo. Sem necessidade de senha.
                    </p>
                    <div className="space-y-1.5">
                      <label htmlFor="magic-email" className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider ml-1">E-mail</label>
                      <input id="magic-email"
                        type="email" value={magicEmail} onChange={e => setMagicEmail(e.target.value)} required placeholder="seu@email.com" 
                        className="w-full h-12 px-4 bg-[#F7F6F3]/50 border border-[#D4D2CB] rounded-[14px] focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] transition-all outline-none text-[#1A1A1A] placeholder:text-[#6B6B6B]/60 text-sm" 
                      />
                    </div>
                    <button type="submit" disabled={loading} className="w-full h-12 mt-2 bg-[#1A1A1A] text-white text-[14px] font-semibold rounded-full hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                      {loading ? "Enviando e-mail..." : "Enviar link mágico"}
                    </button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
            
            {/* Subtle trust signals */}
            <div className="mt-8 flex items-center justify-center gap-6 opacity-40 grayscale">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#1A1A1A]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                <span className="text-[10px] font-bold tracking-tight text-[#1A1A1A]">ENCRYPTED</span>
              </div>
            </div>
            
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
