"use client";

import { useEffect, useState } from "react";
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
import type { PropAccountRow, PropPhase, DrawdownType } from "@/lib/accounts";

interface EditAccountRulesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  prop: PropAccountRow;
  onSaved?: () => Promise<void> | void;
}

const PHASE_OPTIONS: PropPhase[] = ["phase_1", "phase_2", "phase_3", "funded"];

export function EditAccountRulesDrawer({
  open,
  onOpenChange,
  accountId,
  accountName,
  prop,
  onSaved,
}: EditAccountRulesDrawerProps) {
  const [firmName, setFirmName] = useState(prop.firm_name);
  const [startingBalance, setStartingBalance] = useState(String(prop.starting_balance_usd));
  const [totalPhases, setTotalPhases] = useState<number>(prop.total_phases ?? (prop.phase === "funded" ? 0 : 1));
  const [phase, setPhase] = useState<PropPhase>(prop.phase);
  const [profitTarget, setProfitTarget] = useState(String(prop.profit_target_percent));
  const [dailyLoss, setDailyLoss] = useState(String(prop.max_daily_loss_percent));
  const [overallLoss, setOverallLoss] = useState(String(prop.max_overall_loss_percent));
  const [noDailyLimit, setNoDailyLimit] = useState(prop.max_daily_loss_percent === 0);
  const [drawdownType, setDrawdownType] = useState<DrawdownType>(prop.drawdown_type);
  const [trailLockThreshold, setTrailLockThreshold] = useState(
    prop.trail_lock_threshold_usd != null ? String(prop.trail_lock_threshold_usd) : ""
  );
  const [trailLockedFloor, setTrailLockedFloor] = useState(
    prop.trail_locked_floor_usd != null ? String(prop.trail_locked_floor_usd) : ""
  );
  const [resetTimezone, setResetTimezone] = useState(prop.reset_timezone ?? "America/New_York");
  const [resetRule, setResetRule] = useState(prop.reset_rule ?? "forex_close");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirmName(prop.firm_name);
    setStartingBalance(String(prop.starting_balance_usd));
    setTotalPhases(prop.total_phases ?? (prop.phase === "funded" ? 0 : 1));
    setPhase(prop.phase);
    setProfitTarget(String(prop.profit_target_percent));
    setDailyLoss(String(prop.max_daily_loss_percent));
    setOverallLoss(String(prop.max_overall_loss_percent));
    setNoDailyLimit(prop.max_daily_loss_percent === 0);
    setDrawdownType(prop.drawdown_type);
    setTrailLockThreshold(prop.trail_lock_threshold_usd != null ? String(prop.trail_lock_threshold_usd) : "");
    setTrailLockedFloor(prop.trail_locked_floor_usd != null ? String(prop.trail_locked_floor_usd) : "");
    setResetTimezone(prop.reset_timezone ?? "America/New_York");
    setResetRule(prop.reset_rule ?? "forex_close");
    setError(null);
  }, [open, prop]);

  // Keep phase in sync when funded toggle changes
  useEffect(() => {
    if (totalPhases === 0 && phase !== "funded") setPhase("funded");
    else if (totalPhases > 0 && phase === "funded") setPhase("phase_1");
  }, [totalPhases, phase]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const patch: Record<string, unknown> = {
        firm_name: firmName.trim(),
        phase,
        total_phases: totalPhases,
        starting_balance_usd: Number(startingBalance) || 0,
        profit_target_percent: Number(profitTarget) || 0,
        max_daily_loss_percent: noDailyLimit ? 0 : Number(dailyLoss) || 0,
        max_overall_loss_percent: Number(overallLoss) || 0,
        drawdown_type: drawdownType,
        // Trail-lock fields persist regardless of drawdown_type. User futures-table
        // values (HWM, floor) are kept across type toggles so a wrong click doesn't
        // wipe them. Empty input → null (clear), filled → number.
        trail_lock_threshold_usd:
          trailLockThreshold.trim() !== "" ? Number(trailLockThreshold) || null : null,
        trail_locked_floor_usd:
          trailLockedFloor.trim() !== "" ? Number(trailLockedFloor) || null : null,
        reset_timezone: resetTimezone,
        reset_rule: resetRule,
      };

      const res = await fetch("/api/prop-account/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ account_id: accountId, patch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);

      await onSaved?.();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      console.error("[EditAccountRulesDrawer] save failed:", e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar regras — {accountName}</DialogTitle>
          <DialogDescription>
            Personalize as regras da sua mesa. Cada mesa tem particularidades; ajuste conforme o contrato da sua.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da mesa</Label>
              <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Saldo inicial (USD)</Label>
              <Input
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de conta</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTotalPhases(totalPhases > 0 ? totalPhases : 1)}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Total de fases</Label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTotalPhases(n)}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-all",
                        totalPhases === n
                          ? "border-blue-500 bg-blue-500/10 text-blue-500"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fase atual</Label>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as PropPhase)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {PHASE_OPTIONS.filter(
                    (p) => p === "funded" || Number(p.replace("phase_", "")) <= totalPhases
                  ).map((p) => (
                    <option key={p} value={p}>
                      {p === "funded" ? "Funded" : `Phase ${p.replace("phase_", "")}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Meta (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={profitTarget}
                onChange={(e) => setProfitTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">DD Diário (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={dailyLoss}
                onChange={(e) => setDailyLoss(e.target.value)}
                disabled={noDailyLimit}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">DD Total (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={overallLoss}
                onChange={(e) => setOverallLoss(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={noDailyLimit}
              onChange={(e) => setNoDailyLimit(e.target.checked)}
              className="h-3.5 w-3.5 accent-blue-500"
            />
            Mesa não tem limite diário (ex: Lucid funded, alguns futures)
          </label>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de drawdown</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "static" as const, label: "Fixo" },
                { value: "trailing" as const, label: "Trailing" },
                { value: "eod" as const, label: "EOD" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDrawdownType(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                    drawdownType === opt.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-border/60 text-muted-foreground hover:border-border"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 p-3" style={{ backgroundColor: "hsl(var(--muted) / 0.15)" }}>
            <div className="col-span-2">
              <p className="text-[11px] text-muted-foreground">
                {drawdownType === "eod"
                  ? "Trail lock (opcional, futures): quando o balance EOD atinge o threshold, o floor (mínimo de balanço) trava permanentemente."
                  : "Mínimo de balanço (opcional): valor abaixo do qual a conta breach-a. Use se a corretora informa um piso fixo ou se você quer ancorar o cálculo de DD."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">
                {drawdownType === "eod" ? "Threshold de lock (USD)" : "Threshold (USD, opcional)"}
              </Label>
              <Input
                type="number"
                value={trailLockThreshold}
                onChange={(e) => setTrailLockThreshold(e.target.value)}
                placeholder="deixe em branco = sem lock"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Mínimo de balanço (USD)</Label>
              <Input
                type="number"
                value={trailLockedFloor}
                onChange={(e) => setTrailLockedFloor(e.target.value)}
                placeholder="ex: 98020 (piso da conta)"
              />
            </div>
          </div>

          <details className="rounded-xl border border-border/60 p-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Avançado: timezone e reset</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Timezone reset</Label>
                <select
                  value={resetTimezone}
                  onChange={(e) => setResetTimezone(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="Europe/Athens">Europe/Athens (EET/EEST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Regra de reset</Label>
                <select
                  value={resetRule}
                  onChange={(e) => setResetRule(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="forex_close">Forex close (17h NY)</option>
                  <option value="cme_daily">CME daily (17h CT)</option>
                  <option value="midnight">Meia-noite local</option>
                </select>
              </div>
            </div>
          </details>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar regras"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
