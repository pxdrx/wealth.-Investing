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
}

type Step = "type" | "firm" | "details" | "status" | "done";

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

export function AddAccountModal({ open, onOpenChange, onAccountCreated }: AddAccountModalProps) {
  const [step, setStep] = useState<Step>("type");
  const [accountKind, setAccountKind] = useState<AccountKind | null>(null);
  const [selectedFirm, setSelectedFirm] = useState<PropFirmPreset | null>(null);
  const [customFirmName, setCustomFirmName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState<number>(50000);
  const [customBalance, setCustomBalance] = useState("");
  const [phases, setPhases] = useState(2);
  const [isExisting, setIsExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);

  const reset = () => {
    setStep("type");
    setAccountKind(null);
    setSelectedFirm(null);
    setCustomFirmName("");
    setAccountName("");
    setBalance(50000);
    setCustomBalance("");
    setPhases(2);
    setIsExisting(false);
    setSaving(false);
    setError(null);
    setCreatedAccountId(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSelectType = (kind: AccountKind) => {
    setAccountKind(kind);
    if (kind === "prop") {
      setStep("firm");
    } else {
      setStep("details");
    }
  };

  const handleSelectFirm = (firm: PropFirmPreset) => {
    setSelectedFirm(firm);
    setStep("details");
  };

  const handleGoToStatus = () => {
    setStep("status");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Sessão inválida");

      const finalBalance = customBalance ? Number(customBalance) : balance;
      const firmName = selectedFirm?.id === "other" ? customFirmName : selectedFirm?.name ?? "";
      const name = accountKind === "prop"
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

      // If prop, create prop_accounts entry
      if (accountKind === "prop" && selectedFirm) {
        const preset = selectedFirm;
        const { error: propError } = await supabase
          .from("prop_accounts")
          .insert({
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
      onAccountCreated?.(accountId);
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
            {step === "firm" && "Mesa proprietária"}
            {step === "details" && "Detalhes da conta"}
            {step === "status" && "Status da conta"}
            {step === "done" && "Conta criada"}
          </DialogTitle>
          <DialogDescription>
            {step === "type" && "Que tipo de conta você quer adicionar?"}
            {step === "firm" && "Selecione sua mesa proprietária"}
            {step === "details" && "Configure os detalhes da conta"}
            {step === "status" && "A conta é nova ou já está em uso?"}
            {step === "done" && "Sua conta foi adicionada com sucesso."}
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
              onClick={() => setStep(accountKind === "prop" ? "firm" : "type")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>

            {accountKind === "prop" && selectedFirm && (
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

            {accountKind !== "prop" && (
              <div className="space-y-2">
                <Label>Nome da conta</Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={accountKind === "crypto" ? "Ex: Binance, Bybit..." : "Ex: XP, Clear..."}
                />
              </div>
            )}

            <Button onClick={accountKind === "prop" ? handleGoToStatus : handleSave} className="w-full" disabled={saving}>
              {accountKind === "prop" ? "Próximo" : saving ? "Criando..." : "Criar conta"}
            </Button>
          </div>
        )}

        {/* Step: Status (new vs existing) */}
        {step === "status" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>

            <button
              type="button"
              onClick={() => { setIsExisting(false); handleSave(); }}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all hover:border-blue-500/40",
                !isExisting ? "border-blue-500/40 bg-blue-500/5" : "border-border/60"
              )}
            >
              <div className="rounded-lg p-2 bg-emerald-500/10">
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Conta nova</p>
                <p className="text-xs text-muted-foreground">Vou começar do zero nesta mesa</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => { setIsExisting(true); handleSave(); }}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all hover:border-blue-500/40",
                isExisting ? "border-blue-500/40 bg-blue-500/5" : "border-border/60"
              )}
            >
              <div className="rounded-lg p-2 bg-amber-500/10">
                <Briefcase className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Conta em uso</p>
                <p className="text-xs text-muted-foreground">Já tenho trades — vou importar o relatório</p>
              </div>
            </button>

            {error && <p className="text-sm text-destructive">{error}</p>}
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
                {isExisting ? "Conta adicionada!" : "Pronto! Sua conta está ativa."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isExisting
                  ? "Importe o relatório MT5 (.html) para extrair o histórico de trades."
                  : "Sua conta já está selecionada e pronta para uso."}
              </p>
            </div>
            {isExisting ? (
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    handleClose(false);
                    window.location.href = "/app/journal";
                  }}
                  className="w-full gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar relatório MT5 (.html)
                </Button>
                <Button variant="outline" onClick={() => handleClose(false)} className="w-full">
                  Fechar
                </Button>
              </div>
            ) : (
              <Button onClick={() => handleClose(false)} className="w-full">
                Fechar
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
