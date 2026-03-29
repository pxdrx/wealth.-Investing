"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";

interface DdBreachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  date: string; // YYYY-MM-DD
  ddPercent: number;
  ddLimit: number;
}

export function DdBreachModal({
  open,
  onOpenChange,
  accountId,
  accountName,
  date,
  ddPercent,
  ddLimit,
}: DdBreachModalProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError(true); return; }

      const res = await fetch("/api/ai/dd-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ account_id: accountId, account_name: accountName, date, dd_percent: ddPercent, dd_limit: ddLimit }),
      });
      const json = await res.json();
      if (json.ok && json.data?.analysis) {
        setAnalysis(json.data.analysis);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [accountId, accountName, date, ddPercent, ddLimit]);

  useEffect(() => {
    if (open && !analysis && !loading) {
      fetchAnalysis();
    }
  }, [open, analysis, loading, fetchAnalysis]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Conta encerrada — Drawdown diário excedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div
            className="rounded-[16px] border border-red-200 dark:border-red-800/50 p-4"
            style={{ backgroundColor: "hsl(var(--destructive) / 0.05)" }}
          >
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Conta</p>
                <p className="font-semibold">{accountName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-semibold">{new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">DD Diário</p>
                <p className="font-semibold text-red-600 dark:text-red-400">{ddPercent.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Limite</p>
                <p className="font-semibold">{ddLimit}%</p>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Análise do que aconteceu
            </h4>

            {loading && (
              <div className="flex items-center gap-2 py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Analisando os trades do dia...</span>
              </div>
            )}

            {error && !loading && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">Não foi possível gerar a análise.</p>
                <Button variant="outline" size="sm" onClick={fetchAnalysis} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {analysis && !loading && (
              <div className="rounded-[16px] border border-border/40 p-4 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ backgroundColor: "hsl(var(--card))" }}>
                {analysis}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
