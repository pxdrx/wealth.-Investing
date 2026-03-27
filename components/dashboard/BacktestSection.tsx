"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FlaskConical } from "lucide-react";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/context/PrivacyContext";

interface BacktestAccount {
  id: string;
  name: string;
  is_active: boolean;
}

interface BacktestTrade {
  account_id: string;
  pnl_usd: number;
  net_pnl_usd: number;
  opened_at: string;
}

interface BacktestSectionProps {
  accounts: BacktestAccount[];
  trades: BacktestTrade[];
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function BacktestSection({ accounts, trades }: BacktestSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const { mask } = usePrivacy();

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.is_active),
    [accounts]
  );

  // Per-account stats
  const accountStats = useMemo(() => {
    return activeAccounts.map((account) => {
      const accTrades = trades.filter((t) => t.account_id === account.id);
      const totalPnl = accTrades.reduce((s, t) => s + t.net_pnl_usd, 0);
      const wins = accTrades.filter((t) => t.net_pnl_usd > 0).length;
      const losses = accTrades.filter((t) => t.net_pnl_usd < 0).length;
      const totalTrades = accTrades.length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

      const totalWinAmount = accTrades
        .filter((t) => t.net_pnl_usd > 0)
        .reduce((s, t) => s + t.net_pnl_usd, 0);
      const totalLossAmount = accTrades
        .filter((t) => t.net_pnl_usd < 0)
        .reduce((s, t) => s + Math.abs(t.net_pnl_usd), 0);
      const profitFactor = totalLossAmount > 0
        ? totalWinAmount / totalLossAmount
        : totalWinAmount > 0 ? Infinity : 0;

      // Max drawdown (simple sequential)
      let peak = 0;
      let maxDD = 0;
      let cumPnl = 0;
      const sorted = [...accTrades].sort(
        (a, b) => a.opened_at.localeCompare(b.opened_at)
      );
      for (const t of sorted) {
        cumPnl += t.net_pnl_usd;
        if (cumPnl > peak) peak = cumPnl;
        const dd = peak - cumPnl;
        if (dd > maxDD) maxDD = dd;
      }

      // Monthly breakdown for mini calendar
      const monthlyMap = new Map<string, { pnl: number; wins: number; total: number }>();
      for (const t of accTrades) {
        const month = t.opened_at.slice(0, 7);
        const entry = monthlyMap.get(month) ?? { pnl: 0, wins: 0, total: 0 };
        entry.pnl += t.net_pnl_usd;
        entry.total += 1;
        if (t.net_pnl_usd > 0) entry.wins += 1;
        monthlyMap.set(month, entry);
      }

      const months = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          pnl: data.pnl,
          winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
          trades: data.total,
        }));

      return {
        account,
        totalPnl,
        wins,
        losses,
        totalTrades,
        winRate,
        profitFactor,
        maxDD,
        months,
      };
    });
  }, [activeAccounts, trades]);

  // Global stats across all backtest accounts
  const globalStats = useMemo(() => {
    const allTrades = trades.filter((t) =>
      activeAccounts.some((a) => a.id === t.account_id)
    );
    const totalPnl = allTrades.reduce((s, t) => s + t.net_pnl_usd, 0);
    const wins = allTrades.filter((t) => t.net_pnl_usd > 0).length;
    const total = allTrades.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalWinAmount = allTrades
      .filter((t) => t.net_pnl_usd > 0)
      .reduce((s, t) => s + t.net_pnl_usd, 0);
    const totalLossAmount = allTrades
      .filter((t) => t.net_pnl_usd < 0)
      .reduce((s, t) => s + Math.abs(t.net_pnl_usd), 0);
    const profitFactor = totalLossAmount > 0
      ? totalWinAmount / totalLossAmount
      : totalWinAmount > 0 ? Infinity : 0;

    return { totalPnl, wins, losses: total - wins, totalTrades: total, winRate, profitFactor };
  }, [trades, activeAccounts]);

  if (activeAccounts.length === 0) return null;

  const pnlColor = (v: number) =>
    v > 0 ? "hsl(var(--pnl-positive))" : v < 0 ? "hsl(var(--pnl-negative))" : "hsl(var(--landing-text-muted))";

  return (
    <div className="bg-card rounded-[22px] overflow-hidden relative isolate border border-border/40 shadow-sm">
      {/* Header — collapsible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
          <FlaskConical className="h-4 w-4 text-purple-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold tracking-tight">Contas em Backtest</h3>
          <p className="text-[11px] text-muted-foreground">
            {activeAccounts.length} conta{activeAccounts.length !== 1 ? "s" : ""} · {globalStats.totalTrades} trades
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-5 pb-5">
          {/* Global KPIs */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-4 pb-4">
            {[
              { label: "P&L TOTAL", value: mask(`$${Math.abs(globalStats.totalPnl).toFixed(0)}`), color: pnlColor(globalStats.totalPnl), prefix: globalStats.totalPnl >= 0 ? "+" : "-" },
              { label: "WIN RATE", value: globalStats.totalTrades > 0 ? formatPercent(globalStats.winRate) : "—", color: globalStats.winRate >= 50 ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" },
              { label: "PROFIT FACTOR", value: globalStats.profitFactor === Infinity ? "∞" : globalStats.profitFactor > 0 ? globalStats.profitFactor.toFixed(2) : "—", color: globalStats.profitFactor >= 1 ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" },
              { label: "TRADES", value: `${globalStats.wins}W / ${globalStats.losses}L`, color: "hsl(var(--landing-text))" },
              { label: "CONTAS", value: activeAccounts.length.toString(), color: "hsl(var(--landing-text))" },
              { label: "TOTAL TRADES", value: globalStats.totalTrades.toString(), color: "hsl(var(--landing-text))" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg px-3 py-2.5"
                style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}
              >
                <p className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">{kpi.label}</p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: kpi.color }}>
                  {"prefix" in kpi && kpi.prefix ? `${kpi.prefix}${kpi.value}` : kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Per-account cards */}
          <div className="space-y-3">
            {accountStats.map(({ account, totalPnl, winRate, profitFactor, maxDD, totalTrades, wins, losses, months }) => (
              <div
                key={account.id}
                className="rounded-[16px] border border-border/30 overflow-hidden"
                style={{ backgroundColor: "hsl(var(--background))" }}
              >
                {/* Account header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "hsl(var(--landing-text))" }}>
                      {account.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {totalTrades} trades · {wins}W / {losses}L
                    </p>
                  </div>
                  <div className="text-right">
                    <MoneyDisplay value={totalPnl} showSign colorize className="text-sm font-semibold" />
                    <p className="text-[11px] text-muted-foreground">
                      WR {formatPercent(winRate)} · PF {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Mini monthly calendar */}
                {months.length > 0 && (
                  <div className="border-t border-border/20 px-4 py-3">
                    <p className="text-[9px] uppercase tracking-wider mb-2 text-muted-foreground">
                      Assertividade mensal
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {months.map((m) => {
                        const [, mm] = m.month.split("-");
                        const monthLabel = new Date(2024, Number(mm) - 1).toLocaleDateString("pt-BR", { month: "short" });
                        return (
                          <div
                            key={m.month}
                            className="flex flex-col items-center rounded-lg px-2.5 py-1.5 min-w-[52px]"
                            style={{
                              backgroundColor: m.pnl > 0
                                ? "hsl(var(--pnl-positive) / 0.1)"
                                : m.pnl < 0
                                  ? "hsl(var(--pnl-negative) / 0.1)"
                                  : "hsl(var(--muted) / 0.3)",
                            }}
                          >
                            <span className="text-[10px] font-medium text-muted-foreground">{monthLabel}</span>
                            <span
                              className="text-xs font-bold tabular-nums"
                              style={{ color: m.winRate >= 50 ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" }}
                            >
                              {formatPercent(m.winRate)}
                            </span>
                            <span className="text-[9px] text-muted-foreground">{m.trades}t</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Max DD row */}
                {maxDD > 0 && (
                  <div className="border-t border-border/20 px-4 py-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Drawdown</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: "hsl(var(--pnl-negative))" }}>
                      {mask(`-$${maxDD.toFixed(0)}`)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
