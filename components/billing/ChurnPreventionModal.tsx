"use client";

import { useState, useEffect } from "react";
import { X, Database, TrendingUp, Flame, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

interface ChurnPreventionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmCancel: () => void;
  userId: string;
}

interface UserStats {
  totalTrades: number;
  totalDays: number;
  monthsOfData: number;
  currentStreak: number;
  totalPnl: number;
  isLoading: boolean;
}

export function ChurnPreventionModal({ open, onClose, onConfirmCancel, userId }: ChurnPreventionModalProps) {
  const [stats, setStats] = useState<UserStats>({
    totalTrades: 0,
    totalDays: 0,
    monthsOfData: 0,
    currentStreak: 0,
    totalPnl: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!open || !userId) return;

    async function loadStats() {
      const { data: trades } = await supabase
        .from("journal_trades")
        .select("opened_at, pnl_usd")
        .eq("user_id", userId)
        .order("opened_at", { ascending: false });

      if (!trades || trades.length === 0) {
        setStats({ totalTrades: 0, totalDays: 0, monthsOfData: 0, currentStreak: 0, totalPnl: 0, isLoading: false });
        return;
      }

      const totalPnl = trades.reduce((sum, t) => sum + t.pnl_usd, 0);

      const dateSet = new Set<string>();
      for (const row of trades) {
        dateSet.add(new Date(row.opened_at).toISOString().split("T")[0]);
      }

      const sortedDates = Array.from(dateSet).sort();
      const firstDate = new Date(sortedDates[0]);
      const monthsOfData = Math.max(1, Math.ceil((Date.now() - firstDate.getTime()) / (30.44 * 86400000)));

      // Streak
      let streak = 0;
      const today = new Date();
      const checkDate = new Date(today);
      // Try from today, then yesterday
      if (!dateSet.has(checkDate.toISOString().split("T")[0])) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (dateSet.has(checkDate.toISOString().split("T")[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      setStats({
        totalTrades: trades.length,
        totalDays: dateSet.size,
        monthsOfData,
        currentStreak: streak,
        totalPnl,
        isLoading: false,
      });
    }

    loadStats();
  }, [open, userId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md mx-4 rounded-[22px] border border-border/40 shadow-lg"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-lg font-semibold tracking-tight">Tem certeza?</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Stats cards */}
          {!stats.isLoading && stats.totalTrades > 0 && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Você perderia acesso a:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span><strong>{stats.totalTrades}</strong> trades logados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span><strong>{stats.monthsOfData}</strong> {stats.monthsOfData === 1 ? "mês" : "meses"} de dados</span>
                </div>
                {stats.currentStreak > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>Streak de <strong>{stats.currentStreak} dias</strong></span>
                  </div>
                )}
                {stats.totalPnl !== 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={stats.totalPnl >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">P&L total</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Seus relatórios e analytics dependem desses dados para funcionar.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Ao cancelar, você voltará para o plano Free ao final do período atual.
            Seus dados são mantidos, mas o acesso a relatórios e AI Coach será limitado.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={onClose}
              className="w-full rounded-full"
            >
              Manter assinatura
            </Button>
            <button
              onClick={onConfirmCancel}
              className="w-full rounded-full px-4 py-2.5 text-sm text-muted-foreground hover:text-red-500 transition-colors"
            >
              Continuar com cancelamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
