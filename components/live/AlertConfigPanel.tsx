"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { useLiveMonitoringContext } from "@/components/context/LiveMonitoringContext";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AlertConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConfigRow {
  id: string;
  alertType: "daily_dd" | "overall_dd";
  warningPct: number;
  criticalPct: number;
  isActive: boolean;
}

export function AlertConfigPanel({ open, onOpenChange }: AlertConfigPanelProps) {
  const { alertConfigs, refresh } = useLiveMonitoringContext();
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfigs(
      alertConfigs.map((c) => ({
        id: c.id,
        alertType: c.alertType,
        warningPct: c.warningThresholdPct,
        criticalPct: c.criticalThresholdPct,
        isActive: c.isActive,
      }))
    );
  }, [alertConfigs]);

  function updateConfig(id: string, field: keyof ConfigRow, value: number | boolean) {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const config of configs) {
        await supabase
          .from("live_alert_configs")
          .update({
            warning_threshold_pct: config.warningPct,
            critical_threshold_pct: config.criticalPct,
            is_active: config.isActive,
          })
          .eq("id", config.id);
      }
      await refresh();
      onOpenChange(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const labels: Record<string, string> = {
    daily_dd: "Drawdown Diário",
    overall_dd: "Drawdown Geral",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]" style={{ backgroundColor: "hsl(var(--card))" }}>
        <DialogHeader>
          <DialogTitle>Configurar Alertas</DialogTitle>
          <DialogDescription>
            Defina os limites de drawdown para receber alertas em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="space-y-3 rounded-[16px] border border-border/40 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{labels[config.alertType] ?? config.alertType}</span>
                <button
                  onClick={() => updateConfig(config.id, "isActive", !config.isActive)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    config.isActive ? "bg-foreground" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform",
                      config.isActive ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {config.isActive && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Aviso (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={config.warningPct}
                      onChange={(e) => updateConfig(config.id, "warningPct", parseFloat(e.target.value) || 0)}
                      className="rounded-[12px] h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Crítico (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={config.criticalPct}
                      onChange={(e) => updateConfig(config.id, "criticalPct", parseFloat(e.target.value) || 0)}
                      className="rounded-[12px] h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {configs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma configuração de alerta encontrada. Conecte uma conta primeiro.
            </p>
          )}
        </div>

        {configs.length > 0 && (
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
