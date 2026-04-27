"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BrandMark } from "@/components/brand/BrandMark";
import { LoginBackground } from "@/components/login/LoginBackground";
import { supabase } from "@/lib/supabase/client";
import { getMyProfile, toFriendlyMessage, upsertMyProfileDisplayName } from "@/lib/profile";
import {
  Briefcase,
  Wallet,
  Bitcoin,
  Layers,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { ImportDropZone } from "@/components/journal/ImportDropZone";
import { ImportPreview } from "@/components/journal/ImportPreview";

const easeApple = [0.16, 1, 0.3, 1] as const;
const MIN_LENGTH = 2;
const MAX_LENGTH = 20;
const TOTAL_STEPS = 4;

type TraderProfile = "prop" | "personal" | "crypto" | "mix";

const PROFILE_OPTIONS: { value: TraderProfile; label: string; icon: React.ElementType }[] = [
  { value: "prop", label: "Mesa Proprietária", icon: Briefcase },
  { value: "personal", label: "Capital Pessoal", icon: Wallet },
  { value: "crypto", label: "Crypto", icon: Bitcoin },
  { value: "mix", label: "Mix de tudo", icon: Layers },
];

const FIRMS = ["FTMO", "The5ers", "FundedNext", "MyForexFunds", "Outro"];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);

  // Step 3
  const [selectedFirm, setSelectedFirm] = useState<string | null>(null);

  // Step 4 — Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{
    fileName: string;
    totalTrades: number;
    payouts: number;
    trades: { symbol: string; direction: "buy" | "sell"; lots: number; pnl: number; date: string }[];
  } | null>(null);
  const [importState, setImportState] = useState<"idle" | "previewing" | "importing" | "success" | "error">("idle");
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    async function gate() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/login?from=" + encodeURIComponent("/onboarding"); return; }
        const profile = await getMyProfile();
        if (profile?.display_name?.trim()) {
          // Only redirect if user already completed or started the tour
          // Otherwise, let them continue the onboarding steps (2-4)
          try {
            const tourDone = localStorage.getItem("onboarding_tour_completed");
            const tourPending = localStorage.getItem("onboarding_tour_pending");
            if (tourDone || tourPending) {
              window.location.href = "/app";
              return;
            }
          } catch {
            // localStorage unavailable — redirect to be safe
            window.location.href = "/app";
            return;
          }
        }
      } catch (err) {
        setError(toFriendlyMessage(err));
      } finally {
        setChecking(false);
      }
    }
    gate();
  }, [router]);

  function goNext() {
    setDirection(1);
    // If step 2 selected personal or crypto, skip step 3
    if (step === 2 && traderProfile !== "prop" && traderProfile !== "mix") {
      setStep(4);
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  }

  function goBack() {
    setDirection(-1);
    // If on step 4 and profile is personal/crypto, go back to step 2 (skipped 3)
    if (step === 4 && traderProfile !== "prop" && traderProfile !== "mix") {
      setStep(2);
    } else {
      setStep((s) => Math.max(s - 1, 1));
    }
  }

  async function handleSaveName() {
    setError(null);
    const trimmed = displayName.trim();
    if (trimmed.length < MIN_LENGTH) { setError(`Mínimo ${MIN_LENGTH} caracteres.`); return; }
    if (trimmed.length > MAX_LENGTH) { setError(`Máximo ${MAX_LENGTH} caracteres.`); return; }
    setLoading(true);
    try {
      const result = await upsertMyProfileDisplayName(trimmed);
      if (result.error) { setError(result.error.message); return; }
      // Fire welcome 7-day sequence (Track B email engine). Fire-and-forget.
      void (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          await fetch("/api/email/welcome/start", {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        } catch {
          // non-fatal
        }
      })();
      markTourPending();
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    await handleSaveName();
  }

  function markTourPending() {
    try {
      localStorage.setItem("onboarding_tour_pending", "1");
      localStorage.removeItem("onboarding_tour_completed");
    } catch {
      // localStorage unavailable
    }
  }

  function handleFinish() {
    markTourPending();
    window.location.href = "/app";
  }

  async function handleFileSelected(file: File) {
    setImportFile(file);
    setImportError(null);
    setImportState("previewing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/journal/import-mt5?preview=true", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Falha ao processar arquivo");

      setPreviewData({
        fileName: file.name,
        totalTrades: json.trades_found,
        payouts: json.payouts,
        trades: json.sample,
      });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro ao processar arquivo");
      setImportState("error");
      setImportFile(null);
    }
  }

  async function handleImportConfirm() {
    if (!importFile) return;
    setImportState("importing");
    setImportError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }

      // Fetch first account
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      const accountId = accounts?.[0]?.id;
      if (!accountId) throw new Error("Nenhuma conta encontrada. Tente novamente.");

      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("accountId", accountId);

      const res = await fetch("/api/journal/import-mt5", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Falha ao importar");

      setImportState("success");
      markTourPending();
      setTimeout(() => { window.location.href = "/app?imported=true"; }, 1500);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro ao importar");
      setImportState("error");
    }
  }

  function handleImportCancel() {
    setImportFile(null);
    setPreviewData(null);
    setImportState("idle");
    setImportError(null);
  }

  const isNameValid = displayName.trim().length >= MIN_LENGTH;

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
        <div
          className="rounded-[22px] border border-border bg-card p-8 shadow-soft dark:shadow-soft-dark overflow-hidden"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Passo {step} de {TOTAL_STEPS}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted-foreground/15">
              <motion.div
                className="h-1.5 rounded-full bg-foreground"
                initial={false}
                animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.4, ease: easeApple }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 1 — Nome */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: easeApple }}
              >
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

                <form onSubmit={handleStep1Submit} className="space-y-2">
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
                    disabled={loading || !isNameValid}
                    className={[
                      "w-full rounded-[14px] py-3.5 text-sm font-semibold transition-all duration-200",
                      isNameValid && !loading
                        ? "bg-foreground text-background hover:opacity-90 cursor-pointer"
                        : "bg-foreground/20 text-foreground/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {loading ? "Salvando..." : "Continuar →"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 2 — Perfil */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: easeApple }}
              >
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Seu perfil
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight mb-6">
                  O que melhor<br />descreve você?
                </h1>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {PROFILE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = traderProfile === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTraderProfile(opt.value)}
                        className={[
                          "flex flex-col items-center gap-2.5 rounded-[16px] border p-4 transition-all duration-200 cursor-pointer",
                          selected
                            ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
                            : "border-border hover:border-foreground/30 hover:bg-foreground/[0.02]",
                        ].join(" ")}
                      >
                        <Icon
                          size={24}
                          className={selected ? "text-foreground" : "text-muted-foreground"}
                        />
                        <span
                          className={[
                            "text-sm font-medium",
                            selected ? "text-foreground" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center justify-center gap-1.5 rounded-[14px] border border-border px-4 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-200 cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!traderProfile}
                    className={[
                      "flex-1 rounded-[14px] py-3.5 text-sm font-semibold transition-all duration-200",
                      traderProfile
                        ? "bg-foreground text-background hover:opacity-90 cursor-pointer"
                        : "bg-foreground/20 text-foreground/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    Continuar →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Contas (prop firms) */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: easeApple }}
              >
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Suas contas
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight mb-6">
                  Qual firma você<br />opera?
                </h1>

                <div className="flex flex-wrap gap-2 mb-4">
                  {FIRMS.map((firm) => {
                    const selected = selectedFirm === firm;
                    return (
                      <button
                        key={firm}
                        type="button"
                        onClick={() => setSelectedFirm(selected ? null : firm)}
                        className={[
                          "rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer border",
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        ].join(" ")}
                      >
                        {firm}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  className="mb-4 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Não sei, configurar depois
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center justify-center gap-1.5 rounded-[14px] border border-border px-4 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-200 cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 rounded-[14px] py-3.5 text-sm font-semibold bg-foreground text-background hover:opacity-90 cursor-pointer transition-all duration-200"
                  >
                    Continuar →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4 — Import */}
            {step === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: easeApple }}
              >
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Quase lá
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight mb-6">
                  Importe seu primeiro<br />relatório MT5
                </h1>

                {/* Success state */}
                {importState === "success" && (
                  <div className="flex flex-col items-center justify-center py-6 mb-6 gap-3">
                    <CheckCircle2 size={40} className="text-green-500" />
                    <p className="text-sm font-semibold text-foreground">Importado com sucesso!</p>
                    <p className="text-xs text-muted-foreground">Redirecionando para o dashboard...</p>
                  </div>
                )}

                {/* Error state */}
                {importState === "error" && importError && (
                  <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {importError}
                  </div>
                )}

                {/* Preview state */}
                {previewData && importState !== "success" && (
                  <div className="mb-4">
                    <ImportPreview
                      fileName={previewData.fileName}
                      totalTrades={previewData.totalTrades}
                      payouts={previewData.payouts}
                      trades={previewData.trades}
                      compact
                      onConfirm={handleImportConfirm}
                      onCancel={handleImportCancel}
                      loading={importState === "importing"}
                    />
                  </div>
                )}

                {/* Drop zone — shown when no preview/success */}
                {!previewData && importState !== "success" && (
                  <div className="mb-4">
                    <ImportDropZone
                      onFileSelected={handleFileSelected}
                      compact
                      disabled={importState === "previewing"}
                    />
                    {importState === "previewing" && (
                      <p className="mt-2 text-center text-xs text-muted-foreground">Processando arquivo...</p>
                    )}
                    <button
                      type="button"
                      onClick={() => { markTourPending(); window.location.href = "/app"; }}
                      className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
                    >
                      Pular por agora
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={importState === "importing" || importState === "success"}
                    className="flex items-center justify-center gap-1.5 rounded-[14px] border border-border px-4 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={importState === "importing" || importState === "success"}
                    className="flex-1 flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-semibold bg-foreground text-background hover:opacity-90 cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={16} />
                    Explorar primeiro
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
