"use client";

import { useEffect, useState, useCallback } from "react";
import { useSafetyTimeout } from "@/hooks/useSafetyTimeout";
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
import { type PropAccountRow, phaseLabel } from "@/lib/accounts";
import { DrawdownBar } from "@/components/prop/DrawdownBar";
import { StaleBadge } from "@/components/prop/StaleBadge";
import { supabase } from "@/lib/supabase/client";
import { AlertCircle, TrendingUp } from "lucide-react";

const RISCO_THRESHOLD_PCT = 70;

interface PropCardData {
  accountId: string;
  accountName: string;
  propInfo: PropAccountRow;
  cycleStats: PropCycleStats;
  drawdownStats: DrawdownStats | null;
  lastTradeAt: string | null;
}

export default function PropPage() {
  const { accounts } = useActiveAccount();
  const propAccounts = accounts.filter((a) => a.kind === "prop" && a.is_active);

  const [cardsData, setCardsData] = useState<PropCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useSafetyTimeout(loading, setLoading, "prop");

  const fetchAllPropData = useCallback(async () => {
    if (propAccounts.length === 0) {
      setLoading(false);
      setCardsData([]);
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

      const results = await Promise.all(
        propAccounts.map(async (account) => {
          try {
            const propInfo = account.prop;
            if (!propInfo) return null;

            const [cycleStats, drawdownStats, lastTradeRes] = await Promise.all([
              getPropCycleStats(account.id),
              getDrawdownStats(
                supabase,
                account.id,
                userId,
                propInfo.max_daily_loss_percent,
                propInfo.max_overall_loss_percent
              ),
              supabase
                .from("journal_trades")
                .select("closed_at")
                .eq("account_id", account.id)
                .eq("user_id", userId)
                .order("closed_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            ]);

            const lastTradeAt = (lastTradeRes.data as { closed_at?: string } | null)?.closed_at ?? null;

            return {
              accountId: account.id,
              accountName: account.name,
              propInfo,
              cycleStats,
              drawdownStats,
              lastTradeAt,
            } as PropCardData;
          } catch {
            return null;
          }
        })
      );

      setCardsData(results.filter((r): r is PropCardData => r !== null));
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao carregar dados.");
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propAccounts.map((a) => a.id).join(",")]);

  useEffect(() => {
    fetchAllPropData();
  }, [fetchAllPropData]);

  // ---------- No prop accounts ----------
  if (!loading && propAccounts.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Contas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral de todas as suas contas prop.
          </p>
        </div>
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhuma conta prop ativa encontrada. Crie uma conta prop para ver o painel.
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
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Contas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral de todas as suas contas prop.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: propAccounts.length || 2 }).map((_, i) => (
            <Card key={i} className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-40 rounded bg-muted" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="space-y-2">
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
          ))}
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Contas
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 overflow-x-hidden">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Contas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral de todas as suas contas prop · {cardsData.length} conta{cardsData.length !== 1 ? "s" : ""} ativa{cardsData.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {cardsData.map((card) => (
          <PropAccountCard key={card.accountId} data={card} />
        ))}
      </div>
    </div>
  );
}

function PropAccountCard({ data }: { data: PropCardData }) {
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

  const dailyDdPct = drawdownStats?.dailyDdPct ?? 0;
  const overallDdPct = drawdownStats?.overallDdPct ?? 0;
  const hwm = drawdownStats?.highWaterMark ?? startingBalance;
  const currentEquity = startingBalance + profit;
  const overallLossUsed = propInfo.drawdown_type === "trailing"
    ? Math.max(0, hwm - currentEquity)
    : Math.max(0, -profit);
  const overallDistance = Math.max(0, maxOverallLoss - overallLossUsed);

  const metaProgressPct = profitTarget > 0 ? Math.min(100, (profit / profitTarget) * 100) : 0;
  const ddTypeLabel = propInfo.drawdown_type === "trailing" ? "Trailing" : "Estático";

  const status: "ok" | "risco" = overallDdPct >= RISCO_THRESHOLD_PCT ? "risco" : "ok";

  return (
    <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-medium">{accountName}</CardTitle>
          <CardDescription>
            {propInfo.firm_name} · {phaseLabel(propInfo.phase)} · ${startingBalance.toLocaleString()} · DD {ddTypeLabel}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <StaleBadge lastTradeAt={lastTradeAt} />
          {status === "ok" ? (
            <Badge variant="success">OK</Badge>
          ) : (
            <Badge variant="warning">Risco</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Lucro atual (ciclo)
            </p>
            <p className={`text-lg font-bold tabular-nums ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {profit >= 0 ? "+" : ""}${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Falta para meta</p>
            <p className="text-lg font-bold tabular-nums">${remainingToTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Distância do overall</p>
            <p className="text-lg font-bold tabular-nums">${overallDistance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Último payout</p>
            <p className="text-lg font-bold">
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
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Meta (0 → ${profitTarget.toLocaleString()})</span>
            <span className="font-medium tabular-nums">
              ${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${profitTarget.toLocaleString()}
            </span>
          </div>
          <Progress value={Math.max(0, metaProgressPct)} max={100} className="mt-2" />
        </div>

        <Separator />

        <div className="space-y-3">
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
  );
}
