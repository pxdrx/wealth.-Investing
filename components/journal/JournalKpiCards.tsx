"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PeriodFilter } from "./types";
import { filterTradesByPeriod, getNetPnl } from "./types";
import type { JournalTradeRow } from "./types";

interface JournalKpiCardsProps {
  trades: JournalTradeRow[];
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  startingBalanceUsd?: number | null;
}

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "all", label: "Tudo" },
];

export function JournalKpiCards({ trades, period, onPeriodChange, startingBalanceUsd }: JournalKpiCardsProps) {
  const filtered = useMemo(() => filterTradesByPeriod(trades, period), [trades, period]);
  const baseBalance = startingBalanceUsd ?? 0;

  // Total PnL from ALL trades (for current balance calculation)
  const allTimePnl = useMemo(
    () => trades.reduce((sum, t) => sum + getNetPnl(t), 0),
    [trades]
  );
  const currentBalance = baseBalance + allTimePnl;

  const kpis = useMemo(() => {
    // Win/Loss por net_pnl_usd: Win = net_pnl_usd > 0, Loss = net_pnl_usd <= 0
    const nets = filtered.map((t) => getNetPnl(t));
    const total = nets.reduce((a, b) => a + b, 0);
    const wins = nets.filter((n) => n > 0);
    const losses = nets.filter((n) => n <= 0);
    const winrate = filtered.length > 0 ? (wins.length / filtered.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
    const payoff = avgLoss > 0 ? avgWin / avgLoss : wins.length ? 1 : 0;
    const expectation = winrate / 100 * avgWin + (1 - winrate / 100) * (avgLoss > 0 ? -avgLoss : 0);
    const best = filtered.length ? Math.max(...nets) : 0;
    const worst = filtered.length ? Math.min(...nets) : 0;

    return {
      pnlTotal: total,
      winrate,
      payoff,
      expectation,
      bestTrade: best,
      worstTrade: worst,
      totalTrades: filtered.length,
    };
  }, [filtered]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">Resumo do período</CardTitle>
        <div className="flex gap-1 rounded-input border border-border/80 bg-muted/30 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPeriodChange(p.value)}
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors",
                period === p.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {baseBalance > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Saldo da Conta</p>
              <p className={cn("kpi-value text-lg", currentBalance >= baseBalance ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
                {currentBalance.toFixed(2)} USD
              </p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">PnL Total</p>
            <p className={cn("kpi-value text-lg", kpis.pnlTotal >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
              {kpis.pnlTotal >= 0 ? "+" : ""}
              {kpis.pnlTotal.toFixed(2)} USD
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Winrate %</p>
            <p className="kpi-value text-lg">{kpis.winrate.toFixed(1)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Payoff</p>
            <p className="kpi-value text-lg">{kpis.payoff.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Expectativa</p>
            <p className={cn("kpi-value text-lg", kpis.expectation >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
              {kpis.expectation >= 0 ? "+" : ""}
              {kpis.expectation.toFixed(2)} USD
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Melhor trade</p>
            <p className="kpi-value text-lg text-emerald-600 dark:text-emerald-500">
              +{kpis.bestTrade.toFixed(2)} USD
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Pior trade</p>
            <p className="kpi-value text-lg text-red-600 dark:text-red-500">
              {kpis.worstTrade.toFixed(2)} USD
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total trades</p>
            <p className="kpi-value text-lg">{kpis.totalTrades}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
