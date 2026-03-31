"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Activity, Settings, Unplug, RefreshCw, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawdownBar } from "@/components/prop/DrawdownBar";
import { useLiveMonitoringSafe } from "@/components/context/LiveMonitoringContext";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { ConnectMetaApiModal } from "@/components/live/ConnectMetaApiModal";
import { AlertConfigPanel } from "@/components/live/AlertConfigPanel";
import { cn } from "@/lib/utils";

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "agora";
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  return `${Math.floor(minutes / 60)}h atrás`;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

interface PropAccountData {
  max_daily_loss_percent?: number;
  max_overall_loss_percent?: number;
}

export function LiveMonitoringWidget({ propAccount }: { propAccount?: PropAccountData | null }) {
  const monitoring = useLiveMonitoringSafe();
  const { activeAccountId, accounts } = useActiveAccount();
  const [showConnect, setShowConnect] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleSyncTrades = useCallback(async () => {
    if (!monitoring?.syncTrades || syncing) return;
    setSyncing(true);
    setFeedbackMsg(null);
    try {
      const result = await monitoring.syncTrades();
      if (result.ok) {
        setFeedbackMsg(result.imported ? `✓ ${result.imported} trades sincronizados` : "✓ Nenhum trade novo");
      } else {
        setFeedbackMsg(`✗ ${result.error ?? "Erro ao sincronizar"}`);
      }
    } catch {
      setFeedbackMsg("✗ Erro ao sincronizar");
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  }, [monitoring, syncing]);

  const handleRefresh = useCallback(async () => {
    if (!monitoring?.refresh || refreshing) return;
    setRefreshing(true);
    setFeedbackMsg(null);
    try {
      await monitoring.refresh();
      setFeedbackMsg("✓ Dados atualizados");
    } catch {
      setFeedbackMsg("✗ Erro ao atualizar");
    } finally {
      setRefreshing(false);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  }, [monitoring, refreshing]);

  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const accountName = activeAccount?.name ?? "Conta";

  const maxDailyDdPct = propAccount?.max_daily_loss_percent ?? 5;
  const maxOverallDdPct = propAccount?.max_overall_loss_percent ?? 10;

  if (!monitoring) return null;

  // Not connected — show CTA
  if (!monitoring.isConnected && !monitoring.isLoading) {
    return (
      <div
        className="rounded-[22px] border border-dashed border-border/60 p-6 isolate flex flex-col items-center gap-4 text-center"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <WifiOff className="h-8 w-8 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium">Monitoramento ao Vivo</p>
          <p className="text-xs text-muted-foreground mt-1">
            Conecte sua conta MT5 para acompanhar equity, drawdown e posições em tempo real.
          </p>
        </div>
        <Button onClick={() => setShowConnect(true)} className="gap-2">
          <Wifi className="h-4 w-4" />
          Conectar {accountName}
        </Button>
        <ConnectMetaApiModal
          open={showConnect}
          onOpenChange={setShowConnect}
          accountName={accountName}
          accountId={activeAccountId}
          onConnected={() => {
            // Refresh immediately + retry after delays to ensure DB state propagated
            monitoring.refresh();
            setTimeout(() => monitoring.refresh(), 2000);
            setTimeout(() => monitoring.refresh(), 5000);
          }}
        />
      </div>
    );
  }

  // Loading
  if (monitoring.isLoading) {
    return (
      <div
        className="rounded-[22px] border border-border/40 p-6 isolate animate-pulse"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <div className="h-4 w-40 rounded bg-muted mb-4" />
        <div className="h-3 w-full rounded bg-muted mb-3" />
        <div className="h-3 w-3/4 rounded bg-muted" />
      </div>
    );
  }

  // Connected — show live data
  const statusColor =
    monitoring.connectionStatus === "connected"
      ? "bg-emerald-500"
      : monitoring.connectionStatus === "error"
        ? "bg-red-500"
        : "bg-amber-500";

  return (
    <>
      <div
        className="rounded-[22px] border border-border/40 p-5 isolate space-y-4"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full animate-pulse", statusColor)} />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Monitoramento ao Vivo
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSyncTrades}
              disabled={syncing}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title="Sincronizar trades"
            >
              <ArrowDownToLine className={cn("h-3.5 w-3.5 transition-transform", syncing && "animate-bounce")} />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 transition-transform", refreshing && "animate-spin")} />
            </button>
            <button
              onClick={() => setShowAlertConfig(true)}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Configurar alertas"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => monitoring.disconnect()}
              className="rounded-full p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Desconectar"
            >
              <Unplug className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Equity + Balance */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Equity</p>
            <motion.p
              key={monitoring.equity}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="text-lg font-semibold tabular-nums tracking-tight"
            >
              {formatCurrency(monitoring.equity)}
            </motion.p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Balance</p>
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {formatCurrency(monitoring.balance)}
            </p>
          </div>
        </div>

        {/* Daily P&L */}
        <div className="flex items-center justify-between rounded-[16px] border border-border/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">P&L do dia</span>
          </div>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              (monitoring.dailyPnl ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {monitoring.dailyPnl !== null
              ? `${monitoring.dailyPnl >= 0 ? "+" : ""}${formatCurrency(monitoring.dailyPnl)}`
              : "—"}
          </span>
        </div>

        {/* Drawdown bars */}
        <div className="space-y-3">
          <DrawdownBar
            label="DD Diário"
            currentPct={monitoring.dailyDdPct ?? 0}
            maxPct={maxDailyDdPct}
          />
          <DrawdownBar
            label="DD Geral"
            currentPct={monitoring.overallDdPct ?? 0}
            maxPct={maxOverallDdPct}
          />
        </div>

        {/* Feedback */}
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "text-[10px] text-center rounded-[8px] px-2 py-1",
              feedbackMsg.startsWith("✓") ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
            )}
          >
            {feedbackMsg}
          </motion.div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {monitoring.openPositionsCount > 0
              ? `${monitoring.openPositionsCount} posição${monitoring.openPositionsCount > 1 ? "ões" : ""} aberta${monitoring.openPositionsCount > 1 ? "s" : ""}`
              : "Sem posições abertas"}
          </span>
          <span>
            {monitoring.lastUpdate ? formatTimeAgo(monitoring.lastUpdate) : "—"}
          </span>
        </div>
      </div>

      <AlertConfigPanel
        open={showAlertConfig}
        onOpenChange={setShowAlertConfig}
      />
    </>
  );
}
