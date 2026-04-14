"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeRow, DayNote } from "@/components/calendar/types";

interface PropAccountRef {
  account_id: string;
  starting_balance_usd: number;
}

const CalendarPnl = dynamic(
  () => import("@/components/calendar/CalendarPnl").then((m) => ({ default: m.CalendarPnl })),
  { ssr: false, loading: () => <div className="h-[260px] w-full rounded-xl bg-muted animate-pulse" /> },
);

const MonthlyPerformanceGrid = dynamic(
  () => import("@/components/dashboard/MonthlyPerformanceGrid").then((m) => ({ default: m.MonthlyPerformanceGrid })),
  { ssr: false, loading: () => <div className="h-[200px] w-full rounded-xl bg-muted animate-pulse" /> },
);

interface PerformanceCardProps {
  trades: TradeRow[];
  accounts: { id: string; name: string }[];
  dayNotes?: Record<string, DayNote>;
  userId?: string | null;
  propAccounts?: PropAccountRef[];
  startingBalance: number | null;
  onTradeDeleted?: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function PerformanceCard({
  trades,
  accounts,
  dayNotes,
  userId,
  propAccounts,
  startingBalance,
  onTradeDeleted,
}: PerformanceCardProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [perfView, setPerfView] = useState<"mensal" | "geral">("mensal");

  // Default to first account once the list arrives; aggregating multiple
  // accounts (the old "Todas") mixed distinct balances and produced nonsense
  // numbers, so the card is strictly single-account.
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
      return;
    }
    if (selectedAccountId && !accounts.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0]?.id ?? null);
    }
  }, [accounts, selectedAccountId]);

  const filteredTrades = useMemo(() => {
    if (!selectedAccountId) return [];
    return trades.filter((t) => t.account_id === selectedAccountId);
  }, [trades, selectedAccountId]);

  // All-time stats for "Geral" view
  const allTimeStats = useMemo(() => {
    if (filteredTrades.length === 0) return null;

    const totalPnl = filteredTrades.reduce((s, t) => s + (t.net_pnl_usd ?? 0), 0);
    const wins = filteredTrades.filter((t) => (t.net_pnl_usd ?? 0) > 0);
    const losses = filteredTrades.filter((t) => (t.net_pnl_usd ?? 0) < 0);
    const winRate = (wins.length / filteredTrades.length) * 100;
    const avgWin =
      wins.length > 0
        ? wins.reduce((s, t) => s + (t.net_pnl_usd ?? 0), 0) / wins.length
        : 0;
    const avgLoss =
      losses.length > 0
        ? Math.abs(
            losses.reduce((s, t) => s + (t.net_pnl_usd ?? 0), 0) / losses.length
          )
        : 0;
    const profitFactor =
      avgLoss > 0
        ? (avgWin * wins.length) / (avgLoss * losses.length)
        : wins.length > 0
          ? Infinity
          : 0;
    const bestTrade = Math.max(...filteredTrades.map((t) => t.net_pnl_usd ?? 0));
    const worstTrade = Math.min(...filteredTrades.map((t) => t.net_pnl_usd ?? 0));
    const avgTrade = totalPnl / filteredTrades.length;

    return {
      totalTrades: filteredTrades.length,
      totalPnl,
      winRate,
      wins: wins.length,
      losses: losses.length,
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade,
      worstTrade,
      avgTrade,
    };
  }, [filteredTrades]);

  // Determine starting balance for selected account
  const effectiveStartingBalance = useMemo(() => {
    if (!selectedAccountId) return null;
    const prop = propAccounts?.find((p) => p.account_id === selectedAccountId);
    if (prop?.starting_balance_usd) return prop.starting_balance_usd;
    return startingBalance;
  }, [selectedAccountId, propAccounts, startingBalance]);

  return (
    <div
      className="rounded-[22px] overflow-hidden relative isolate border border-border/40 shadow-sm"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
            <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">Performance</h3>
        </div>

        {/* View toggle + Account selector pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPerfView("mensal")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                perfView === "mensal"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setPerfView("geral")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                perfView === "geral"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Geral
            </button>
          </div>

          <div className="h-4 w-px bg-border/60" />
        </div>

        {/* Account selector pills */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedAccountId(a.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all border",
                selectedAccountId === a.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {perfView === "mensal" && (
          <>
            {/* Calendar (full mode with KPI strip) */}
            <CalendarPnl
              trades={filteredTrades}
              dayNotes={dayNotes}
              userId={userId}
              accountId={selectedAccountId}
              accountIds={accounts.map((a) => a.id)}
              onTradeDeleted={onTradeDeleted}
            />

            {/* Monthly Performance Grid */}
            <div className="pt-3">
              <MonthlyPerformanceGrid
                trades={filteredTrades}
                activeAccountId={selectedAccountId}
                startingBalance={effectiveStartingBalance}
              />
            </div>
          </>
        )}

        {perfView === "geral" && allTimeStats && (
          <div className="space-y-4">
            {/* Main PnL */}
            <div className="text-center py-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                P&L Total
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  allTimeStats.totalPnl >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {allTimeStats.totalPnl >= 0 ? "+" : ""}
                {formatCurrency(allTimeStats.totalPnl)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allTimeStats.totalTrades} trades
              </p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Win Rate",
                  value: `${allTimeStats.winRate.toFixed(1)}%`,
                  sub: `${allTimeStats.wins}W / ${allTimeStats.losses}L`,
                },
                {
                  label: "Profit Factor",
                  value:
                    allTimeStats.profitFactor === Infinity
                      ? "\u221E"
                      : allTimeStats.profitFactor.toFixed(2),
                },
                {
                  label: "M\u00E9dia/Trade",
                  value: formatCurrency(allTimeStats.avgTrade),
                },
                {
                  label: "Melhor Trade",
                  value: formatCurrency(allTimeStats.bestTrade),
                },
                {
                  label: "Pior Trade",
                  value: formatCurrency(allTimeStats.worstTrade),
                },
                {
                  label: "M\u00E9dia Win",
                  value: formatCurrency(allTimeStats.avgWin),
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-[16px] border border-border/30 p-3 text-center"
                >
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    {kpi.label}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">{kpi.value}</p>
                  {kpi.sub && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {kpi.sub}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {perfView === "geral" && !allTimeStats && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhum trade encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
