"use client";

import { useMemo } from "react";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";

interface AccountsOverviewProps {
  accounts: Array<{
    id: string;
    name: string;
    kind: string;
    is_active: boolean;
  }>;
  propAccounts: Array<{
    account_id: string;
    firm_name: string;
    phase: string;
    starting_balance_usd: number;
    daily_dd_limit?: number;
    max_dd_limit?: number;
  }>;
  trades: Array<{
    account_id: string;
    pnl_usd: number;
    net_pnl_usd: number;
    direction: string;
    opened_at: string;
  }>;
  propPayoutsTotal: number;
}


function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function isCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function AccountsOverview({
  accounts,
  propAccounts,
  trades,
  propPayoutsTotal,
}: AccountsOverviewProps) {
  const propAccountMap = useMemo(() => {
    const map = new Map<string, (typeof propAccounts)[0]>();
    for (const pa of propAccounts) map.set(pa.account_id, pa);
    return map;
  }, [propAccounts]);

  const currentMonthTrades = useMemo(
    () => trades.filter((t) => isCurrentMonth(t.opened_at)),
    [trades]
  );

  // KPI: Capital Total Funded (active prop accounts)
  const capitalFunded = useMemo(() => {
    return accounts
      .filter((a) => a.is_active && a.kind === "prop")
      .reduce((sum, a) => {
        const pa = propAccountMap.get(a.id);
        return sum + (pa?.starting_balance_usd ?? 0);
      }, 0);
  }, [accounts, propAccountMap]);

  // KPI: P&L Mês (all accounts, current month)
  const pnlMes = useMemo(
    () => currentMonthTrades.reduce((sum, t) => sum + t.net_pnl_usd, 0),
    [currentMonthTrades]
  );

  // KPI: Contas Ativas
  const contasAtivas = useMemo(
    () => accounts.filter((a) => a.is_active).length,
    [accounts]
  );

  // Per-account metrics
  const accountRows = useMemo(() => {
    return accounts
      .filter((a) => a.is_active)
      .map((account) => {
        const pa = propAccountMap.get(account.id);
        const monthTrades = currentMonthTrades.filter(
          (t) => t.account_id === account.id
        );

        // P&L Mês for this account
        const pnl = monthTrades.reduce((sum, t) => sum + t.net_pnl_usd, 0);

        // Win Rate
        const total = monthTrades.length;
        const wins = monthTrades.filter((t) => t.net_pnl_usd > 0).length;
        const winRate = total > 0 ? (wins / total) * 100 : null;

        // Drawdown (only for prop)
        let ddDiario: number | null = null;
        let ddTotal: number | null = null;
        let ddDiarioLimit: number | null = null;
        let ddTotalLimit: number | null = null;
        let ddRiskLevel = 0; // 0-1 scale for sorting

        if (pa && account.kind === "prop") {
          const startingBalance = pa.starting_balance_usd;

          // Daily DD: losses today
          const todayStr = new Date().toISOString().slice(0, 10);
          const todayLosses = trades
            .filter(
              (t) =>
                t.account_id === account.id &&
                t.opened_at.slice(0, 10) === todayStr &&
                t.net_pnl_usd < 0
            )
            .reduce((sum, t) => sum + t.net_pnl_usd, 0);
          ddDiario =
            startingBalance > 0
              ? (Math.abs(todayLosses) / startingBalance) * 100
              : 0;
          ddDiarioLimit = pa.daily_dd_limit ?? null;

          // Total DD: monthly losses
          const monthLosses = monthTrades
            .filter((t) => t.net_pnl_usd < 0)
            .reduce((sum, t) => sum + t.net_pnl_usd, 0);
          ddTotal =
            startingBalance > 0
              ? (Math.abs(monthLosses) / startingBalance) * 100
              : 0;
          ddTotalLimit = pa.max_dd_limit ?? null;

          // Risk level for sorting
          const dailyRisk =
            ddDiarioLimit && ddDiarioLimit > 0
              ? ddDiario / ddDiarioLimit
              : 0;
          const totalRisk =
            ddTotalLimit && ddTotalLimit > 0 ? ddTotal / ddTotalLimit : 0;
          ddRiskLevel = Math.max(dailyRisk, totalRisk);
        }

        // Status
        let status: "risk" | "ok" | "personal" | "crypto";
        if (account.kind === "prop") {
          status = ddRiskLevel > 0.7 ? "risk" : "ok";
        } else if (account.kind === "crypto") {
          status = "crypto";
        } else {
          status = "personal";
        }

        return {
          account,
          pa,
          pnl,
          winRate,
          ddDiario,
          ddTotal,
          ddDiarioLimit,
          ddTotalLimit,
          ddRiskLevel,
          status,
        };
      })
      .sort((a, b) => {
        // Prop first (sorted by risk desc), then personal, then crypto
        const kindOrder = (k: string) =>
          k === "prop" ? 0 : k === "personal" ? 1 : 2;
        const ka = kindOrder(a.account.kind);
        const kb = kindOrder(b.account.kind);
        if (ka !== kb) return ka - kb;
        if (a.account.kind === "prop") return b.ddRiskLevel - a.ddRiskLevel;
        return 0;
      });
  }, [accounts, propAccountMap, currentMonthTrades, trades]);

  const kpis = [
    {
      label: "Capital Total Funded",
      render: <MoneyDisplay value={capitalFunded} className="metric-value text-[26px] leading-tight" />,
    },
    {
      label: "Total Sacado",
      render: <MoneyDisplay value={propPayoutsTotal} className="metric-value text-[26px] leading-tight" />,
    },
    {
      label: "P&L Mês",
      render: <MoneyDisplay value={pnlMes} showSign colorize className="metric-value text-[26px] leading-tight" />,
    },
    {
      label: "Contas Ativas",
      render: <span className="metric-value text-[26px] leading-tight">{contasAtivas}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card rounded-[22px] p-5 relative isolate overflow-hidden border border-border/40 shadow-sm"
          >
            <p className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              {kpi.label}
            </p>
            {kpi.render}
          </div>
        ))}
      </div>

      <div
        className="bg-card rounded-[22px] overflow-hidden relative isolate border border-border/40 shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground px-4 py-3 font-medium">
                  Conta
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground px-4 py-3 font-medium">
                  P&L Mês
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground px-4 py-3 font-medium">
                  DD Diário
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground px-4 py-3 font-medium">
                  DD Total
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground px-4 py-3 font-medium">
                  Win Rate
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground px-4 py-3 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {accountRows.map(
                ({
                  account,
                  pa,
                  pnl,
                  winRate,
                  ddDiario,
                  ddTotal,
                  ddDiarioLimit,
                  ddTotalLimit,
                  status,
                }) => {
                  const isRisk = status === "risk";
                  return (
                    <tr
                      key={account.id}
                      className="border-t border-border/50 transition-colors"
                      style={
                        isRisk
                          ? { backgroundColor: "hsl(var(--pnl-negative) / 0.05)" }
                          : undefined
                      }
                    >
                      {/* Conta */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {account.name}
                        </p>
                        {pa && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {pa.firm_name} · {pa.phase}
                          </p>
                        )}
                      </td>

                      {/* P&L Mês */}
                      <td className="px-4 py-3 text-right metric-value text-sm font-semibold">
                        <MoneyDisplay value={pnl} showSign colorize />
                      </td>

                      {/* DD Diário */}
                      <td className="px-4 py-3 text-right metric-value text-xs text-muted-foreground">
                        {ddDiario !== null ? (
                          <span
                            style={
                              ddDiarioLimit && ddDiario / ddDiarioLimit > 0.7
                                ? { color: "hsl(var(--pnl-negative))", fontWeight: "bold" }
                                : undefined
                            }
                          >
                            {formatPercent(ddDiario)}
                            {ddDiarioLimit ? ` / ${formatPercent(ddDiarioLimit)}` : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* DD Total */}
                      <td className="px-4 py-3 text-right metric-value text-xs text-muted-foreground">
                        {ddTotal !== null ? (
                          <span
                            style={
                              ddTotalLimit && ddTotal / ddTotalLimit > 0.7
                                ? { color: "hsl(var(--pnl-negative))", fontWeight: "bold" }
                                : undefined
                            }
                          >
                            {formatPercent(ddTotal)}
                            {ddTotalLimit ? ` / ${formatPercent(ddTotalLimit)}` : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Win Rate */}
                      <td className="px-4 py-3 text-right metric-value text-xs text-muted-foreground">
                        {winRate !== null ? (
                          `${winRate.toFixed(0)}%`
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-right">
                        {status === "risk" && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-red-500/10 text-red-500">
                            ⚠️ Risco
                          </span>
                        )}
                        {status === "ok" && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                            OK
                          </span>
                        )}
                        {status === "personal" && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Pessoal
                          </span>
                        )}
                        {status === "crypto" && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-500">
                            Crypto
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }
              )}

              {accountRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhuma conta ativa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
