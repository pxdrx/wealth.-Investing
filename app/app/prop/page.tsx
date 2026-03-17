"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useActiveAccount } from "@/components/context/ActiveAccountContext";
import { getPropCycleStats, getDrawdownStats, type PropCycleStats, type DrawdownStats } from "@/lib/prop-stats";
import { listMyAccountsWithProp, type PropAccountRow, phaseLabel } from "@/lib/accounts";
import { checkAndCreateAlerts, type PropAlert } from "@/lib/prop-alerts";
import { DrawdownBar } from "@/components/prop/DrawdownBar";
import { StaleBadge } from "@/components/prop/StaleBadge";
import { supabase } from "@/lib/supabase/client";
import { AlertCircle, TrendingUp } from "lucide-react";

const RISCO_THRESHOLD_PCT = 70;

interface PropPageData {
  propInfo: PropAccountRow;
  cycleStats: PropCycleStats;
  drawdownStats: DrawdownStats | null;
  accountName: string;
  lastTradeAt: string | null;
}

export default function PropPage() {
  const { accounts, activeAccountId } = useActiveAccount();
  const activeAccount = activeAccountId ? accounts.find((a) => a.id === activeAccountId) : null;
  const activeName = activeAccount?.name ?? "—";
  const isProp = activeAccount?.kind === "prop";

  const [data, setData] = useState<PropPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<PropAlert[]>([]);

  const fetchData = useCallback(async () => {
    if (!activeAccountId || !isProp) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError("Sessão inválida");
        setLoading(false);
        return;
      }
      const userId = session.user.id;

      const [accountsWithProp, cycleStats] = await Promise.all([
        listMyAccountsWithProp(),
        getPropCycleStats(activeAccountId),
      ]);

      const match = accountsWithProp.find((a) => a.id === activeAccountId);
      if (!match?.prop) {
        setError("Dados da conta prop não encontrados.");
        setData(null);
        setLoading(false);
        return;
      }

      const propInfo = match.prop;

      // Fetch drawdown stats via RPC
      const drawdownStats = await getDrawdownStats(
        supabase,
        activeAccountId,
        userId,
        propInfo.max_daily_loss_percent,
        propInfo.max_overall_loss_percent
      );

      // Get last trade date for stale badge
      const { data: lastTrade } = await supabase
        .from("journal_trades")
        .select("closed_at")
        .eq("account_id", activeAccountId)
        .eq("user_id", userId)
        .order("closed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastTradeAt = (lastTrade as { closed_at?: string } | null)?.closed_at ?? null;

      setData({
        propInfo,
        cycleStats,
        drawdownStats,
        accountName: match.name,
        lastTradeAt,
      });

      // Check and create alerts (fire-and-forget for toasts)
      if (drawdownStats) {
        checkAndCreateAlerts(
          supabase,
          activeAccountId,
          userId,
          drawdownStats.dailyDdPct,
          drawdownStats.overallDdPct,
          propInfo.max_daily_loss_percent,
          propInfo.max_overall_loss_percent
        ).then((newAlerts) => {
          if (newAlerts.length > 0) {
            setAlerts((prev) => [...prev, ...newAlerts]);
          }
        }).catch(() => {});
      }

      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao carregar dados.");
      setLoading(false);
    }
  }, [activeAccountId, isProp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Not a prop account ----------
  if (!isProp) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm text-muted-foreground mb-1">Conta ativa: {activeName}</p>
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
            Prop
          </h1>
          <p className="mt-1 text-muted-foreground leading-relaxed-apple">
            Painel de acompanhamento de contas de avaliação.
          </p>
        </div>
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Selecione uma conta prop para ver os dados de avaliação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm text-muted-foreground mb-1">Conta ativa: {activeName}</p>
        <div className="mb-10">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-40 rounded bg-muted" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-6 w-32 rounded bg-muted" />
                  </div>
                ))}
              </div>
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm text-muted-foreground mb-1">Conta ativa: {activeName}</p>
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
            Prop
          </h1>
        </div>
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- No data ----------
  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm text-muted-foreground mb-1">Conta ativa: {activeName}</p>
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
            Prop
          </h1>
        </div>
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhum dado de conta prop encontrado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Real data from prop_accounts ----------
  const { propInfo, cycleStats, drawdownStats, accountName, lastTradeAt } = data;
  const startingBalance = propInfo.starting_balance_usd;
  const profitTargetPct = propInfo.profit_target_percent;
  const maxDailyLossPct = propInfo.max_daily_loss_percent;
  const maxOverallLossPct = propInfo.max_overall_loss_percent;

  const profitTarget = startingBalance * (profitTargetPct / 100);
  const maxDailyLoss = startingBalance * (maxDailyLossPct / 100);
  const maxOverallLoss = startingBalance * (maxOverallLossPct / 100);

  const profit = cycleStats.profitSinceLastPayout;
  const remainingToTarget = Math.max(0, profitTarget - profit);

  // Drawdown values from RPC (or fallback to cycle-based)
  const dailyDdPct = drawdownStats?.dailyDdPct ?? 0;
  const overallDdPct = drawdownStats?.overallDdPct ?? 0;
  const overallLossUsed = Math.max(0, -profit);
  const overallDistance = Math.max(0, maxOverallLoss - overallLossUsed);

  const metaProgressPct = profitTarget > 0 ? Math.min(100, (profit / profitTarget) * 100) : 0;
  const ddTypeLabel = propInfo.drawdown_type === "trailing" ? "Trailing" : "Estático";

  const status: "ok" | "risco" = overallDdPct >= RISCO_THRESHOLD_PCT ? "risco" : "ok";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12" data-account-id={activeAccountId ?? undefined}>
      <p className="text-sm text-muted-foreground mb-1">Conta ativa: {activeName}</p>
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
            Prop
          </h1>
          <p className="mt-1 text-muted-foreground leading-relaxed-apple">
            {propInfo.firm_name} · {phaseLabel(propInfo.phase)} · Saldo inicial ${startingBalance.toLocaleString()} · DD {ddTypeLabel}
          </p>
        </div>
        <StaleBadge lastTradeAt={lastTradeAt} />
      </div>

      {/* Alert toasts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 rounded-xl border border-amber-500/30 px-4 py-3"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-foreground">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-medium">{accountName}</CardTitle>
                <CardDescription>
                  Meta {profitTargetPct}% (${profitTarget.toLocaleString()}) · Max diário {maxDailyLossPct}% (${maxDailyLoss.toLocaleString()}) · Max overall {maxOverallLossPct}% (${maxOverallLoss.toLocaleString()})
                </CardDescription>
              </div>
              {status === "ok" ? (
                <Badge variant="success">OK</Badge>
              ) : (
                <Badge variant="warning">Risco</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Lucro atual (ciclo)
                  </p>
                  <p className={`kpi-value text-xl ${profit >= 0 ? "text-emerald-800 dark:text-emerald-500" : "text-red-600 dark:text-red-400"}`}>
                    {profit >= 0 ? "+" : ""}${profit.toLocaleString()}
                  </p>
                  {cycleStats.totalHistorical !== cycleStats.profitSinceLastPayout && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Total histórico: ${cycleStats.totalHistorical.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Falta para meta</p>
                  <p className="kpi-value text-xl">${remainingToTarget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Distância do overall</p>
                  <p className="kpi-value text-xl">${overallDistance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Último payout</p>
                  <p className="kpi-value text-xl">
                    {cycleStats.lastPayoutAt
                      ? new Date(cycleStats.lastPayoutAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Nenhum"}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso da meta (0 → ${profitTarget.toLocaleString()})</span>
                  <span className="font-medium">
                    ${profit.toLocaleString()} / ${profitTarget.toLocaleString()}
                  </span>
                </div>
                <Progress value={Math.max(0, metaProgressPct)} max={100} className="mt-2" />
              </div>

              <Separator />

              {/* Drawdown bars */}
              <div className="space-y-4">
                <DrawdownBar
                  label="Drawdown Diário"
                  currentPct={dailyDdPct}
                  maxPct={maxDailyLossPct}
                />
                <DrawdownBar
                  label="Drawdown Geral"
                  currentPct={overallDdPct}
                  maxPct={maxOverallLossPct}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
