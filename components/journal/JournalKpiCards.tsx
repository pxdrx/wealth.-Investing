"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/context/PrivacyContext";
import type { PeriodFilter } from "./types";
import { filterTradesByPeriod, getNetPnl } from "./types";
import type { JournalTradeRow } from "./types";
import { computeTradeAnalytics } from "@/lib/trade-analytics";

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
  const { mask } = usePrivacy();
  const filtered = useMemo(() => filterTradesByPeriod(trades, period), [trades, period]);
  const baseBalance = startingBalanceUsd ?? 0;

  // Total PnL from ALL trades (for current balance calculation)
  const allTimePnl = useMemo(
    () => trades.reduce((sum, t) => sum + getNetPnl(t), 0),
    [trades]
  );
  const currentBalance = baseBalance + allTimePnl;

  const kpis = useMemo(() => {
    // Audit 2026-04-17 F2: single source of truth for all metrics.
    // Expectancy must match `trade-analytics.ts` exactly — the old local
    // calculation produced divergent values when breakeven trades diluted
    // avgLoss.
    const analytics = computeTradeAnalytics(filtered);
    const nets = filtered.map((t) => getNetPnl(t));
    const best = filtered.length ? Math.max(...nets) : 0;
    const worst = filtered.length ? Math.min(...nets) : 0;

    return {
      pnlTotal: analytics.netPnl,
      winrate: analytics.winRate,
      avgRR: analytics.avgRR,
      tradesWithoutRR: analytics.tradesWithoutRR,
      expectation: analytics.expectancy,
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
              <p className={cn("kpi-value text-lg whitespace-nowrap", currentBalance >= baseBalance ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
                {mask(`${currentBalance.toFixed(2)} USD`)}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">PnL Total</p>
            <p className={cn("kpi-value text-lg whitespace-nowrap", kpis.pnlTotal >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
              {mask(`${kpis.pnlTotal >= 0 ? "+" : ""}${kpis.pnlTotal.toFixed(2)} USD`)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Winrate %</p>
            <p className="kpi-value text-lg whitespace-nowrap">{kpis.winrate.toFixed(1)}%</p>
          </div>
          <div className="space-y-1">
            <p
              className="text-xs font-medium text-muted-foreground"
              title={kpis.tradesWithoutRR > 0 ? `${kpis.tradesWithoutRR} trades sem SL` : undefined}
            >
              RR médio
            </p>
            <p className="kpi-value text-lg whitespace-nowrap">
              {kpis.totalTrades > 0 && kpis.tradesWithoutRR === kpis.totalTrades
                ? "—"
                : kpis.avgRR > 0
                  ? kpis.avgRR.toFixed(2)
                  : "—"}
            </p>
            {kpis.tradesWithoutRR > 0 && kpis.tradesWithoutRR < kpis.totalTrades && (
              <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                {kpis.tradesWithoutRR} trades sem SL
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Expectativa</p>
            <p className={cn("kpi-value text-lg whitespace-nowrap", kpis.expectation >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
              {mask(`${kpis.expectation >= 0 ? "+" : ""}${kpis.expectation.toFixed(2)} USD`)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Melhor trade</p>
            <p className={cn("kpi-value text-lg whitespace-nowrap", kpis.bestTrade >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500")}>
              {mask(`${kpis.bestTrade > 0 ? "+" : ""}${kpis.bestTrade.toFixed(2)} USD`)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Pior trade</p>
            <p className="kpi-value text-lg whitespace-nowrap text-red-600 dark:text-red-500">
              {mask(`${kpis.worstTrade.toFixed(2)} USD`)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total trades</p>
            <p className="kpi-value text-lg whitespace-nowrap">{kpis.totalTrades}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
