"use client";

import { useState } from "react";
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
import { Briefcase, Wallet, Bitcoin, Building2, ChevronLeft, Check, Upload } from "lucide-react";
import type { AccountKind } from "@/lib/accounts";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountCreated?: (id: string) => void;
  onRefreshAccounts?: () => Promise<void>;
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
}

const PROP_FIRMS: PropFirmPreset[] = [
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
  },
  {
    id: "fundednext",
    name: "FundedNext",
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    ddTotal: 10,
    ddDaily: 5,
    targetPhase1: 8,
    targetPhase2: 5,
  },
  {
    id: "topstep",
    name: "TopStep",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    ddTotal: 10,
    ddDaily: 5,
    targetPhase1: 8,
    targetPhase2: 5,
  },
  {
    id: "myforexfunds",
    name: "MyForexFunds",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    ddTotal: 10,
    ddDaily: 5,
    targetPhase1: 8,
    targetPhase2: 5,
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
  },
];

const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];

export function AddAccountModal({ open, onOpenChange, onAccountCreated, onRefreshAccounts }: AddAccountModalProps) {
  const [step, setStep] = useState<Step>("type");
  const [accountKind, setAccountKind] = useState<AccountKind | null>(null);
  const [selectedFirm, setSelectedFirm] = useState<PropFirmPreset | null>(null);
  const [customFirmName, setCustomFirmName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState<number>(50000);
  const [customBalance, setCustomBalance] = useState("");
  const [phases, setPhases] = useState(2);
  const [drawdownType, setDrawdownType] = useState<"static" | "trailing">("static");
  const [cryptoSubKind, setCryptoSubKind] = useState<"prop" | "personal" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState("");
  const [editableName, setEditableName] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  const reset = () => {
    setStep("type");
    setAccountKind(null);
    setSelectedFirm(null);
    setCustomFirmName("");
    setAccountName("");
    setBalance(50000);
    setCustomBalance("");
    setPhases(2);
    setDrawdownType("static");
    setCryptoSubKind(null);
    setSaving(false);
    setError(null);
    setCreatedAccountId(null);
    setSuggestedName("");
    setEditableName("");
    setRenameSaving(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
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
    setStep("details");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Sessão inválida");

      const finalBalance = customBalance ? Number(customBalance) : balance;
      const firmName = selectedFirm?.id === "other" ? customFirmName : selectedFirm?.name ?? "";
      const isPropFlow = accountKind === "prop" || cryptoSubKind === "prop";
      const name = isPropFlow
        ? `${firmName} ${finalBalance >= 1000 ? `${(finalBalance / 1000).toFixed(0)}k` : finalBalance}`
        : accountName || (accountKind === "crypto" ? "Crypto" : "Capital Pessoal");

      // Create account
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .insert({
          user_id: session.user.id,
          name,
          kind: accountKind,
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
        const { error: propError } = await supabase
          .from("prop_accounts")
          .insert({
            user_id: session.user.id,
            account_id: accountId,
            firm_name: firmName,
            phase: "phase_1",
            starting_balance_usd: finalBalance,
            profit_target_percent: preset.targetPhase1,
            max_daily_loss_percent: preset.ddDaily,
            max_overall_loss_percent: preset.ddTotal,
            reset_timezone: "America/New_York",
            reset_rule: "daily_close",
          });

        if (propError) throw propError;
      }

      setCreatedAccountId(accountId);
      setSuggestedName(name);
      setEditableName(name);
      onAccountCreated?.(accountId);
      await onRefreshAccounts?.();
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar conta");
    } finally {
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
              onClick={() => setStep("type")}
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
            <button
              type="button"
              onClick={() => setStep((accountKind === "prop" || cryptoSubKind === "prop") ? "firm" : accountKind === "crypto" ? "crypto-sub" : "type")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>

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
                  <Label>Número de fases</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPhases(n)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                          phases === n
                            ? "border-blue-500 bg-blue-500/10 text-blue-500"
                            : "border-border/60 text-muted-foreground hover:border-border"
                        )}
                      >
                        {n} fase{n > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de drawdown</Label>
                  <div className="flex gap-2">
                    {([
                      { value: "static" as const, label: "Estatico", desc: "DD fixo desde o saldo inicial" },
                      { value: "trailing" as const, label: "Trailing", desc: "DD acompanha o lucro maximo" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDrawdownType(opt.value)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-left transition-all",
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
                    {phases >= 2 && (
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
                  placeholder={accountKind === "crypto" ? "Ex: Binance, Bybit..." : "Ex: XP, Clear..."}
                />
              </div>
            )}

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? "Criando..." : "Criar conta"}
            </Button>
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
                  await onRefreshAccounts?.();
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
