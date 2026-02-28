"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type PropStatus = "ok" | "risco" | "violado" | "aprovado";

const mockAccounts = [
  {
    id: "prop-1",
    name: "Prop Firm A — Phase 1",
    phase: "Phase 1",
    initialBalance: 100_000,
    equity: 102_400,
    profit: 2_400,
    profitTarget: 8_000,
    maxDailyLoss: 2_000,
    dailyLossUsed: 320,
    maxOverallLoss: 10_000,
    overallLossDistance: 10_000,
    status: "ok" as PropStatus,
  },
  {
    id: "prop-2",
    name: "Prop Firm B — Phase 2",
    phase: "Phase 2",
    initialBalance: 100_000,
    equity: 106_100,
    profit: 6_100,
    profitTarget: 5_000,
    maxDailyLoss: 2_000,
    dailyLossUsed: 0,
    maxOverallLoss: 10_000,
    overallLossDistance: 10_000,
    status: "aprovado" as PropStatus,
  },
  {
    id: "prop-3",
    name: "Prop Firm C — Funded",
    phase: "Funded",
    initialBalance: 200_000,
    equity: 198_200,
    profit: -1_800,
    profitTarget: 0,
    maxDailyLoss: 4_000,
    dailyLossUsed: 1_200,
    maxOverallLoss: 20_000,
    overallLossDistance: 18_200,
    status: "risco" as PropStatus,
  },
];

const mockRegras = [
  "Máximo 2% de risco por operação.",
  "Sem hold overnight em notícias de alto impacto.",
  "Respeitar drawdown máximo diário e total.",
  "Mínimo de 5 dias de trading na fase de avaliação.",
];

function PropStatusBadge({ status }: { status: PropStatus }) {
  const map = {
    ok: <Badge variant="success">OK</Badge>,
    risco: <Badge variant="warning">Risco</Badge>,
    violado: <Badge variant="destructive">Violado</Badge>,
    aprovado: <Badge variant="secondary">Aprovado</Badge>,
  };
  return map[status];
}

function AccountCard({ account }: { account: (typeof mockAccounts)[0] }) {
  const profitTargetPct = account.profitTarget
    ? Math.min(100, (account.profit / account.profitTarget) * 100)
    : 0;
  const dailyRemaining = account.maxDailyLoss - account.dailyLossUsed;
  const dailyUsedPct = (account.dailyLossUsed / account.maxDailyLoss) * 100;
  const overallSafePct = Math.max(
    0,
    (account.overallLossDistance / account.maxOverallLoss) * 100
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-medium">{account.name}</CardTitle>
          <CardDescription>{account.phase}</CardDescription>
        </div>
        <PropStatusBadge status={account.status} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo inicial</p>
            <p className="kpi-value text-lg">${account.initialBalance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Equity atual</p>
            <p className="kpi-value text-lg">${account.equity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Lucro atual</p>
            <p
              className={`kpi-value text-lg ${
                account.profit >= 0
                  ? "text-emerald-800 dark:text-emerald-500"
                  : "text-red-800 dark:text-red-500"
              }`}
            >
              {account.profit >= 0 ? "+" : ""}${account.profit.toLocaleString()}
            </p>
          </div>
        </div>

        {account.profitTarget > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta de lucro</span>
                <span className="font-medium">
                  ${account.profit.toLocaleString()} / ${account.profitTarget.toLocaleString()}
                </span>
              </div>
              <Progress value={profitTargetPct} max={100} className="mt-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                Faltam ${(account.profitTarget - account.profit).toLocaleString()} para a meta
              </p>
            </div>
          </>
        )}

        <Separator />
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Max perda diária</span>
            <span className="font-medium">
              ${account.dailyLossUsed.toLocaleString()} / ${account.maxDailyLoss.toLocaleString()}
            </span>
          </div>
          <Progress value={dailyUsedPct} max={100} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            Resta hoje: ${dailyRemaining.toLocaleString()}
          </p>
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Max perda total — distância do limite</span>
            <span className="font-medium">${account.overallLossDistance.toLocaleString()}</span>
          </div>
          <Progress value={overallSafePct} max={100} className="mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PropPage() {
  const [activeId, setActiveId] = useState(mockAccounts[0].id);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight-apple leading-tight-apple text-foreground">
          Prop
        </h1>
        <p className="mt-1 text-muted-foreground leading-relaxed-apple">
          Contas de avaliação e funded. Metas, limites e status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Tabs value={activeId} onValueChange={setActiveId}>
            <TabsList className="mb-6">
              {mockAccounts.map((acc) => (
                <TabsTrigger key={acc.id} value={acc.id}>
                  {acc.phase}
                </TabsTrigger>
              ))}
            </TabsList>
            {mockAccounts.map((acc) => (
              <TabsContent key={acc.id} value={acc.id}>
                <AccountCard account={acc} />
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Regras</CardTitle>
              <CardDescription>Resumo das regras da conta (mock)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                {mockRegras.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
