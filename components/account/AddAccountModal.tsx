"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Briefcase, Wallet, Bitcoin, Building2, ChevronLeft, Check, Upload, FlaskConical, Crown } from "lucide-react";
import type { AccountKind } from "@/lib/accounts";
import { useEntitlements } from "@/hooks/use-entitlements";
import Link from "next/link";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountCreated?: (id: string) => void;
  onRefreshAccounts?: () => Promise<void>;
  defaultKind?: AccountKind;
}

type Step = "type" | "crypto-sub" | "firm" | "details" | "done" | "rename";

interface PropFirmPreset {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  ddTotal: number;
  ddDaily: number;
  targetPhase1: number;
  targetPhase2: number;
  drawdownType: "static" | "trailing" | "eod";
  totalPhases: number; // 0 = funded-direct, 1-3 = evaluation
  /** EOD trail lock threshold as %-of-starting (ex: 0.1 = starting+0.1%) */
  trailLockThresholdPct: number | null;
  /** EOD trail-locked floor as %-of-starting (ex: -2.9 = starting-2.9%) */
  trailLockedFloorPct: number | null;
}

const PROP_FIRMS: PropFirmPreset[] = [
  // Forex
  {
    id: "ftmo",
    name: "FTMO",
    color: "#0ea5e9",
    bgColor: "rgba(14, 165, 233, 0.1)",
    borderColor: "rgba(14, 165, 233, 0.3)",
    ddTotal: 10,
    ddDaily: 5,
    targetPhase1: 10,
    targetPhase2: 5,
    drawdownType: "static",
    totalPhases: 2,
    trailLockThresholdPct: null,
    trailLockedFloorPct: null,
  },
  {
    id: "the5ers",
    name: "The5ers",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    ddTotal: 10,
    ddDaily: 5,
    targetPhase1: 8,
    targetPhase2: 5,
    drawdownType: "static",
    totalPhases: 2,
    trailLockThresholdPct: null,
    trailLockedFloorPct: null,
  },
  // Futures (EOD)
  {
    id: "lucid",
    name: "Lucid Trading",
    color: "#a855f7",
    bgColor: "rgba(168, 85, 247, 0.1)",
    borderColor: "rgba(168, 85, 247, 0.3)",
    ddTotal: 3,
    ddDaily: 0,
    targetPhase1: 6,
    targetPhase2: 0,
    drawdownType: "eod",
    totalPhases: 1,
    trailLockThresholdPct: 0.1,  // +$100 em conta de 100k
    trailLockedFloorPct: -2.9,   // $97.100 em conta de 100k
  },
  {
    id: "apex",
    name: "Apex Trader Funding",
    color: "#22d3ee",
    bgColor: "rgba(34, 211, 238, 0.1)",
    borderColor: "rgba(34, 211, 238, 0.3)",
    ddTotal: 3,
    ddDaily: 0,
    targetPhase1: 6,
    targetPhase2: 0,
    drawdownType: "eod",
    totalPhases: 1,
    trailLockThresholdPct: 0.1,
    trailLockedFloorPct: -2.9,
  },
  {
    id: "topstep",
    name: "Topstep",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    ddTotal: 3,
    ddDaily: 0,
    targetPhase1: 6,
    targetPhase2: 0,
    drawdownType: "eod",
    totalPhases: 1,
    trailLockThresholdPct: 0.1,
    trailLockedFloorPct: -2.9,
  },
  {
    id: "other",
    name: "Outra mesa",
    color: "#6b7280",
    bgColor: "rgba(107, 114, 128, 0.1)",
    borderColor: "rgba(107, 114, 128, 0.3)",
    ddTotal: 10,
    ddDaily: 5,
    targetPhase1: 8,
    targetPhase2: 5,
    drawdownType: "static",
    totalPhases: 2,
    trailLockThresholdPct: null,
    trailLockedFloorPct: null,
  },
];

const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];

export function AddAccountModal({ open, onOpenChange, onAccountCreated, onRefreshAccounts, defaultKind }: AddAccountModalProps) {
  const { limits, plan } = useEntitlements();
  const [cachedUserId, setCachedUserId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(defaultKind ? "details" : "type");
  const [accountKind, setAccountKind] = useState<AccountKind | null>(defaultKind ?? null);
  const [accountLimitReached, setAccountLimitReached] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<PropFirmPreset | null>(null);
  const [customFirmName, setCustomFirmName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState<number>(50000);
  const [customBalance, setCustomBalance] = useState("");
  const [totalPhases, setTotalPhases] = useState<number>(2); // 0 = funded, 1-3 = evaluation
  const [drawdownType, setDrawdownType] = useState<"static" | "trailing" | "eod">("static");
  const [trailLockThresholdUsd, setTrailLockThresholdUsd] = useState<string>("");
  const [trailLockedFloorUsd, setTrailLockedFloorUsd] = useState<string>("");
  const [cryptoSubKind, setCryptoSubKind] = useState<"prop" | "personal" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState("");
  const [editableName, setEditableName] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Pre-fetch userId when modal opens so handleSave never calls getSession()
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setCachedUserId(session?.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, [open]);

  const reset = () => {
    setStep(defaultKind ? "details" : "type");
    setAccountKind(defaultKind ?? null);
    setSelectedFirm(null);
    setCustomFirmName("");
    setAccountName("");
    setBalance(50000);
    setCustomBalance("");
    setTotalPhases(2);
    setDrawdownType("static");
    setTrailLockThresholdUsd("");
    setTrailLockedFloorUsd("");
    setCryptoSubKind(null);
    setSaving(false);
    setError(null);
    setCreatedAccountId(null);
    setSuggestedName("");
    setEditableName("");
    setRenameSaving(false);
    setAccountLimitReached(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    if (v) {
      // When opening, respect defaultKind
      if (defaultKind) {
        setStep("details");
        setAccountKind(defaultKind);
      } else {
        setStep("type");
        setAccountKind(null);
      }
    }
    onOpenChange(v);
  };

  const handleSelectType = (kind: AccountKind) => {
    setAccountKind(kind);
    if (kind === "prop") {
      setStep("firm");
    } else if (kind === "crypto") {
      // Ask if crypto is prop or personal
      setCryptoSubKind(null);
      setStep("crypto-sub" as Step);
    } else {
      setStep("details");
    }
  };

  const handleSelectFirm = (firm: PropFirmPreset) => {
    setSelectedFirm(firm);
    setDrawdownType(firm.drawdownType);
    setTotalPhases(firm.totalPhases);
    setStep("details");
  };

  // Auto-fill trail lock USD when preset + balance are known and user hasn't typed overrides
  const computedTrailThreshold = (selectedFirm?.trailLockThresholdPct != null && drawdownType === "eod")
    ? (customBalance ? Number(customBalance) : balance) * (1 + (selectedFirm.trailLockThresholdPct / 100))
    : null;
  const computedTrailFloor = (selectedFirm?.trailLockedFloorPct != null && drawdownType === "eod")
    ? (customBalance ? Number(customBalance) : balance) * (1 + (selectedFirm.trailLockedFloorPct / 100))
    : null;

  // Wraps onRefreshAccounts with a 5s timeout to prevent deadlock from getSession()
  const safeRefresh = () => {
    if (!onRefreshAccounts) return;
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("refresh timeout")), 5000)
    );
    Promise.race([onRefreshAccounts(), timeout]).catch((err) => {
      console.warn("[AddAccountModal] refresh timed out or failed:", err);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setAccountLimitReached(false);

    // Hard safety timeout — guarantees loading state is cleared
    const safetyTimer = setTimeout(() => {
      console.warn("[AddAccountModal] safety timeout triggered");
      setSaving(false);
    }, 10000);

    try {
      // Use pre-cached userId (resolved on modal open) to avoid getSession() deadlock
      const userId = cachedUserId;
      if (!userId) throw new Error("Sessão inválida. Feche e abra o modal novamente.");

      // Backtest accounts are always free — skip limit check
      const isBacktest = accountKind === "backtest";
      if (!isBacktest && limits.maxAccounts !== null) {
        const { count, error: countError } = await supabase
          .from("accounts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        if (countError) throw countError;
        if ((count ?? 0) >= limits.maxAccounts) {
          setAccountLimitReached(true);
          clearTimeout(safetyTimer);
          setSaving(false);
          return;
        }
      }

      const finalBalance = customBalance ? Number(customBalance) : balance;
      const firmName = selectedFirm?.id === "other" ? customFirmName : selectedFirm?.name ?? "";
      const isPropFlow = accountKind === "prop" || cryptoSubKind === "prop";
      const baseName = isPropFlow
        ? `${firmName} ${finalBalance >= 1000 ? `${(finalBalance / 1000).toFixed(0)}k` : finalBalance}`
        : accountName || (accountKind === "crypto" ? "Crypto" : accountKind === "backtest" ? "Backtest" : "Capital Pessoal");

      // Dedup name: if "FTMO 50k" exists, try "FTMO 50k (2)", "FTMO 50k (3)", etc.
      let name = baseName;
      const { data: existing } = await supabase
        .from("accounts")
        .select("name")
        .eq("user_id", userId)
        .like("name", `${baseName}%`);
      if (existing && existing.length > 0) {
        const existingNames = new Set(existing.map((r: { name: string }) => r.name));
        if (existingNames.has(baseName)) {
          let suffix = 2;
          while (existingNames.has(`${baseName} (${suffix})`)) suffix++;
          name = `${baseName} (${suffix})`;
        }
      }

      // If crypto account is being created as a prop sub-kind, store as "prop" in DB
      const effectiveKind = (accountKind === "crypto" && cryptoSubKind === "prop") ? "prop" : accountKind;

      // Create account
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .insert({
          user_id: userId,
          name,
          kind: effectiveKind,
          is_active: true,
        })
        .select("id")
        .maybeSingle();

      if (accountError) throw accountError;
      if (!accountData) throw new Error("Falha ao criar conta");

      const accountId = (accountData as { id: string }).id;

      // If prop flow (including crypto-prop), create prop_accounts entry
      if (isPropFlow && selectedFirm) {
        const preset = selectedFirm;
        const initialPhase = totalPhases === 0 ? "funded" : "phase_1";
        const trailThresholdFinal =
          drawdownType === "eod"
            ? trailLockThresholdUsd
              ? Number(trailLockThresholdUsd)
              : computedTrailThreshold
            : null;
        const trailFloorFinal =
          drawdownType === "eod"
            ? trailLockedFloorUsd
              ? Number(trailLockedFloorUsd)
              : computedTrailFloor
            : null;
        const { error: propError } = await supabase
          .from("prop_accounts")
          .insert({
            user_id: userId,
            account_id: accountId,
            firm_name: firmName,
            phase: initialPhase,
            total_phases: totalPhases,
            starting_balance_usd: finalBalance,
            profit_target_percent: preset.targetPhase1,
            max_daily_loss_percent: preset.ddDaily,
            max_overall_loss_percent: preset.ddTotal,
            reset_timezone: "America/New_York",
            reset_rule: "forex_close",
            drawdown_type: drawdownType,
            trail_lock_threshold_usd: trailThresholdFinal,
            trail_locked_floor_usd: trailFloorFinal,
          });

        if (propError) {
          // Rollback: remove the account we just created
          await supabase.from("accounts").delete().eq("id", accountId).eq("user_id", userId);
          throw propError;
        }
      }

      // Success — update UI immediately, refresh in background
      setCreatedAccountId(accountId);
      setSuggestedName(name);
      setEditableName(name);
      setSaving(false);
      clearTimeout(safetyTimer);
      onAccountCreated?.(accountId);

      // Re-trigger the onboarding tour for this new account
      try {
        localStorage.setItem("onboarding_tour_pending", "1");
        localStorage.removeItem("onboarding_tour_completed");
      } catch {
        // localStorage unavailable
      }

      if (defaultKind) {
        // For inline creation (e.g., backtest), close modal and auto-select new account
        handleClose(false);
        safeRefresh();
      } else {
        setStep("done");
        // Fire-and-forget with timeout protection — never blocks UI
        safeRefresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao criar conta";
      console.error("[AddAccountModal] handleSave error:", msg);
      setError(msg);
      clearTimeout(safetyTimer);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" showClose={true}>
        <DialogHeader>
          <DialogTitle>
            {step === "type" && "Nova conta de trading"}
            {step === "crypto-sub" && "Tipo de conta crypto"}
            {step === "firm" && "Mesa proprietária"}
            {step === "details" && "Detalhes da conta"}
            {step === "done" && "Conta criada"}
            {step === "rename" && "Nome da conta"}
          </DialogTitle>
          <DialogDescription>
            {step === "type" && "Que tipo de conta você quer adicionar?"}
            {step === "crypto-sub" && "Selecione o tipo da sua conta crypto"}
            {step === "firm" && "Selecione sua mesa proprietária"}
            {step === "details" && "Configure os detalhes da conta"}
            {step === "done" && "Sua conta foi adicionada com sucesso."}
            {step === "rename" && "Escolha um nome para sua conta"}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Account Type */}
        {step === "type" && (
          <div className="space-y-2">
            {([
              { kind: "prop" as const, label: "Mesa Proprietária", desc: "FTMO, The5ers, FundedNext...", icon: Briefcase, color: "text-blue-500" },
              { kind: "personal" as const, label: "Capital Pessoal", desc: "Conta com capital próprio", icon: Wallet, color: "text-emerald-500" },
              { kind: "crypto" as const, label: "Crypto", desc: "Conta de criptomoedas", icon: Bitcoin, color: "text-amber-500" },
              { kind: "backtest" as const, label: "Backtest", desc: "Conta para testes e simulações", icon: FlaskConical, color: "text-purple-500" },
            ]).map((opt) => (
              <button
                key={opt.kind}
                type="button"
                onClick={() => handleSelectType(opt.kind)}
                className="flex w-full items-center gap-4 rounded-xl border border-border/60 p-4 text-left transition-all hover:border-blue-500/40 hover:shadow-sm"
                style={{ backgroundColor: "hsl(var(--muted) / 0.1)" }}
              >
                <div className={cn("rounded-lg p-2.5", opt.color)} style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                  <opt.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: Crypto Sub-Kind */}
        {step === "crypto-sub" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setStep("type")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
            >
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>
            <p className="text-sm text-muted-foreground mb-3">Esta conta crypto é de uma mesa proprietária ou capital pessoal?</p>
            <button
              type="button"
              onClick={() => { setCryptoSubKind("prop"); setStep("firm"); }}
              className="flex w-full items-center gap-4 rounded-xl border border-border/60 p-4 text-left transition-all hover:border-blue-500/40 hover:shadow-sm"
              style={{ backgroundColor: "hsl(var(--muted) / 0.1)" }}
            >
              <div className="rounded-lg p-2.5 text-blue-500" style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mesa Proprietária</p>
                <p className="text-xs text-muted-foreground">TopStep, Apex, mesa de futuros...</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setCryptoSubKind("personal"); setStep("details"); }}
              className="flex w-full items-center gap-4 rounded-xl border border-border/60 p-4 text-left transition-all hover:border-blue-500/40 hover:shadow-sm"
              style={{ backgroundColor: "hsl(var(--muted) / 0.1)" }}
            >
              <div className="rounded-lg p-2.5 text-emerald-500" style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Capital Pessoal</p>
                <p className="text-xs text-muted-foreground">Binance, Bybit, carteira pessoal...</p>
              </div>
            </button>
          </div>
        )}

        {/* Step: Prop Firm Selection */}
        {step === "firm" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setStep(cryptoSubKind === "prop" ? "crypto-sub" : "type")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
            >
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>
            <div className="grid grid-cols-2 gap-2">
              {PROP_FIRMS.map((firm) => (
                <button
                  key={firm.id}
                  type="button"
                  onClick={() => handleSelectFirm(firm)}
                  className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-all hover:scale-[1.02] hover:shadow-md"
                  style={{
                    backgroundColor: firm.bgColor,
                    borderColor: firm.borderColor,
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white"
                    style={{ backgroundColor: firm.color }}
                  >
                    {firm.name.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: firm.color }}>
                    {firm.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === "details" && (
          <div className="space-y-4">
            {!defaultKind && (
              <button
                type="button"
                onClick={() => setStep((accountKind === "prop" || cryptoSubKind === "prop") ? "firm" : accountKind === "crypto" ? "crypto-sub" : "type")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-3 w-3" /> Voltar
              </button>
            )}

            {(accountKind === "prop" || cryptoSubKind === "prop") && selectedFirm && (
              <>
                {selectedFirm.id === "other" && (
                  <div className="space-y-2">
                    <Label>Nome da mesa</Label>
                    <Input
                      value={customFirmName}
                      onChange={(e) => setCustomFirmName(e.target.value)}
                      placeholder="Nome da mesa proprietária"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tamanho da conta (USD)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCOUNT_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => { setBalance(size); setCustomBalance(""); }}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                          balance === size && !customBalance
                            ? "border-blue-500 bg-blue-500/10 text-blue-500"
                            : "border-border/60 text-muted-foreground hover:border-border"
                        )}
                      >
                        ${(size / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    value={customBalance}
                    onChange={(e) => setCustomBalance(e.target.value)}
                    placeholder="Ou valor customizado..."
                    className="mt-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de conta</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTotalPhases(selectedFirm.totalPhases > 0 ? selectedFirm.totalPhases : 2)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                        totalPhases > 0
                          ? "border-blue-500 bg-blue-500/10 text-blue-500"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      )}
                    >
                      Evaluation
                    </button>
                    <button
                      type="button"
                      onClick={() => setTotalPhases(0)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                        totalPhases === 0
                          ? "border-blue-500 bg-blue-500/10 text-blue-500"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      )}
                    >
                      Funded
                    </button>
                  </div>
                </div>

                {totalPhases > 0 && (
                  <div className="space-y-2">
                    <Label>Quantas fases tem o challenge?</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTotalPhases(n)}
                          className={cn(
                            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                            totalPhases === n
                              ? "border-blue-500 bg-blue-500/10 text-blue-500"
                              : "border-border/60 text-muted-foreground hover:border-border"
                          )}
                        >
                          {n === 1 ? "1 fase" : `${n} fases`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tipo de drawdown</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "static" as const, label: "Fixo", desc: "DD sobre saldo inicial" },
                      { value: "trailing" as const, label: "Trailing", desc: "DD acompanha HWM intraday" },
                      { value: "eod" as const, label: "EOD", desc: "DD trava por fechamento diário" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDrawdownType(opt.value)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition-all",
                          drawdownType === opt.value
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-border/60 hover:border-border"
                        )}
                      >
                        <p className={cn("text-sm font-medium", drawdownType === opt.value ? "text-blue-500" : "text-muted-foreground")}>{opt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {drawdownType === "eod" && (
                  <div className="space-y-3 rounded-xl border border-border/60 p-3" style={{ backgroundColor: "hsl(var(--muted) / 0.15)" }}>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Trail lock (opcional)</p>
                      <p className="text-[11px] text-muted-foreground">
                        Em mesas como Lucid/Apex/Topstep, o floor trava permanentemente quando a conta fecha acima de um threshold. Deixe em branco para auto-preencher com base no preset.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Threshold (USD)</Label>
                        <Input
                          type="number"
                          value={trailLockThresholdUsd}
                          onChange={(e) => setTrailLockThresholdUsd(e.target.value)}
                          placeholder={computedTrailThreshold ? `$${computedTrailThreshold.toLocaleString()}` : "—"}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Floor travado (USD)</Label>
                        <Input
                          type="number"
                          value={trailLockedFloorUsd}
                          onChange={(e) => setTrailLockedFloorUsd(e.target.value)}
                          placeholder={computedTrailFloor ? `$${computedTrailFloor.toLocaleString()}` : "—"}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Preset preview */}
                <div className="rounded-xl border border-border/40 p-3 space-y-1" style={{ backgroundColor: "hsl(var(--muted) / 0.1)" }}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Regras aplicadas</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">DD Total:</span>
                    <span className="font-medium text-foreground">{selectedFirm.ddTotal}%</span>
                    <span className="text-muted-foreground">DD Diário:</span>
                    <span className="font-medium text-foreground">{selectedFirm.ddDaily}%</span>
                    <span className="text-muted-foreground">Meta Fase 1:</span>
                    <span className="font-medium text-foreground">{selectedFirm.targetPhase1}%</span>
                    {totalPhases >= 2 && selectedFirm.targetPhase2 > 0 && (
                      <>
                        <span className="text-muted-foreground">Meta Fase 2:</span>
                        <span className="font-medium text-foreground">{selectedFirm.targetPhase2}%</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {accountKind !== "prop" && cryptoSubKind !== "prop" && (
              <div className="space-y-2">
                <Label>Nome da conta</Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={accountKind === "crypto" ? "Ex: Binance, Bybit..." : accountKind === "backtest" ? "Ex: SMC, ICT, Fundamentalista..." : "Ex: XP, Clear..."}
                />
              </div>
            )}

            {accountLimitReached && (
              <div
                className="flex flex-col items-center gap-3 rounded-xl border border-border/60 p-6 text-center"
                style={{ backgroundColor: "hsl(var(--muted) / 0.15)" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm font-semibold">Limite de contas atingido</p>
                <p className="text-xs text-muted-foreground">
                  Seu plano {plan === "free" ? "Free" : plan === "ultra" ? "Ultra" : plan === "mentor" ? "Mentor" : "Pro"} permite {limits.maxAccounts} {limits.maxAccounts === 1 ? "conta" : "contas"}.
                  Faça upgrade para adicionar mais.
                </p>
                <Link
                  href="/app/pricing"
                  className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Ver planos
                </Link>
              </div>
            )}

            {error && !accountLimitReached && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {!accountLimitReached && (
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? "Criando..." : "Criar conta"}
              </Button>
            )}
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Conta adicionada com sucesso!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sua conta já está selecionada e pronta para uso. Importe um relatório MT5 no Journal para começar.
              </p>
            </div>

            {/* One-time futures import notice — only appears for prop / futures
                style accounts because their broker exports (Tradovate Position
                History, etc.) typically ship gross PnL with no fee column.
                The user sees this once on account creation; the calibration
                banner in ImportResult resolves the actual delta after import. */}
            {(accountKind === "prop" || cryptoSubKind === "prop") && (
              <div
                className="rounded-lg border border-amber-400/40 p-3 text-left"
                style={{ backgroundColor: "hsl(40 95% 55% / 0.06)" }}
              >
                <p className="text-xs leading-relaxed text-foreground">
                  <strong>Atenção sobre saldos de contas de futuros:</strong>{" "}
                  Brokers como Tradovate e NinjaTrader exportam apenas o lucro
                  bruto, sem as taxas (corretagem, exchange, clearing). Por
                  isso, na primeira importação o saldo pode ficar acima do
                  valor real.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground mt-2">
                  Não se preocupe: depois do primeiro import, vai aparecer um
                  banner pedindo para você colar o saldo real do broker. O
                  sistema calcula a taxa por contrato sozinho e aplica
                  automaticamente nas próximas importações desta conta.
                </p>
              </div>
            )}
            <Button onClick={() => setStep("rename")} className="w-full">
              Personalizar nome
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleClose(false);
                window.location.href = "/app/journal";
              }}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar relatório MT5
            </Button>
            <Button variant="ghost" onClick={() => handleClose(false)} className="w-full">
              Fechar
            </Button>
          </div>
        )}

        {/* Step: Rename */}
        {step === "rename" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da conta</Label>
              <Input
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                placeholder={suggestedName}
              />
              {suggestedName && editableName !== suggestedName && (
                <button
                  type="button"
                  onClick={() => setEditableName(suggestedName)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Usar sugestão: {suggestedName}
                </button>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={async () => {
                if (!createdAccountId || !editableName.trim()) return;
                setRenameSaving(true);
                setError(null);
                try {
                  const { error: updateError } = await supabase
                    .from("accounts")
                    .update({ name: editableName.trim() })
                    .eq("id", createdAccountId);
                  if (updateError) throw updateError;
                  // Fire-and-forget with timeout — getSession() inside can deadlock
                  safeRefresh();
                  handleClose(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Erro ao renomear");
                } finally {
                  setRenameSaving(false);
                }
              }}
              className="w-full"
              disabled={renameSaving || !editableName.trim()}
            >
              {renameSaving ? "Salvando..." : "Salvar nome"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
