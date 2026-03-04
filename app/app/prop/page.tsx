"use client";

import { useEffect, useState } from "react";
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
import { getPropCycleStats, type PropCycleStats } from "@/lib/prop-stats";

const RISCO_THRESHOLD_PCT = 70;

const mockAccount = {
  name: "The5% 100k",
  initialBalance: 100_000,
  equity: 104_200,
  profit: 4_200,
  profitTarget: 8_000,
  maxDailyLoss: 5_000,
  dailyLossUsed: 1_200,
  maxOverallLoss: 10_000,
  overallLossUsed: 0,
};

function getStatus(profit: number): "ok" | "risco" {
  const dailyPct = (mockAccount.dailyLossUsed / mockAccount.maxDailyLoss) * 100;
  const overallPct = (mockAccount.overallLossUsed / mockAccount.maxOverallLoss) * 100;
  if (dailyPct >= RISCO_THRESHOLD_PCT || overallPct >= RISCO_THRESHOLD_PCT) return "risco";
  return "ok";
}

export default function PropPage() {
  const { accounts, activeAccountId } = useActiveAccount();
  const activeAccount = activeAccountId ? accounts.find((a) => a.id === activeAccountId) : null;
  const activeName = activeAccount?.name ?? "—";
  const isProp = activeAccount?.kind === "prop";

  const [cycleStats, setCycleStats] = useState<PropCycleStats | null>(null);
  useEffect(() => {
    if (!activeAccountId || !isProp) return;
    getPropCycleStats(activeAccountId).then(setCycleStats);
  }, [activeAccountId, isProp]);

  const profit = cycleStats ? cycleStats.profitSinceLastPayout : mockAccount.profit;
  const remainingToTarget = Math.max(0, mockAccount.profitTarget - profit);
  const remainingToday = mockAccount.maxDailyLoss - mockAccount.dailyLossUsed;
  const overallDistance = mockAccount.maxOverallLoss - mockAccount.overallLossUsed;

  const metaProgressPct = Math.min(100, (profit / mockAccount.profitTarget) * 100);
  const dailyRiskPct = (mockAccount.dailyLossUsed / mockAccount.maxDailyLoss) * 100;
  const overallRiskPct = (mockAccount.overallLossUsed / mockAccount.maxOverallLoss) * 100;

  const status = getStatus(profit);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12" data-account-id={activeAccountId ?? undefined}>
      <p className="text-sm text-muted-foreground mb-1">Conta ativa: {activeName}</p>
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
          Prop
        </h1>
        <p className="mt-1 text-muted-foreground leading-relaxed-apple">
          Conta de avaliação. Meta 8%, max diário 5%, max overall 10%. Dados mock.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-medium">{mockAccount.name}</CardTitle>
                <CardDescription>
                  Saldo inicial $100k · Meta 8% ($8k) · Max diário 5% ($5k) · Max overall 10% ($10k)
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
                    Lucro atual {isProp ? "(ciclo)" : ""}
                  </p>
                  <p className="kpi-value text-xl text-emerald-800 dark:text-emerald-500">
                    +${profit.toLocaleString()}
                  </p>
                  {isProp && cycleStats != null && cycleStats.totalHistorical !== cycleStats.profitSinceLastPayout && (
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
                  <p className="text-xs font-medium text-muted-foreground">Resta perder hoje</p>
                  <p className="kpi-value text-xl">${remainingToday.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Distância do overall</p>
                  <p className="kpi-value text-xl">${overallDistance.toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso da meta (0 → $8k)</span>
                  <span className="font-medium">
                    ${profit.toLocaleString()} / ${mockAccount.profitTarget.toLocaleString()}
                  </span>
                </div>
                <Progress value={metaProgressPct} max={100} className="mt-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Risco diário (usado vs limite $5k)</span>
                  <span className="font-medium">
                    ${mockAccount.dailyLossUsed.toLocaleString()} / ${mockAccount.maxDailyLoss.toLocaleString()}
                  </span>
                </div>
                <Progress value={dailyRiskPct} max={100} className="mt-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Risco overall (usado vs limite $10k)</span>
                  <span className="font-medium">
                    ${mockAccount.overallLossUsed.toLocaleString()} / ${mockAccount.maxOverallLoss.toLocaleString()}
                  </span>
                </div>
                <Progress value={overallRiskPct} max={100} className="mt-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
