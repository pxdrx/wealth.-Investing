"use client";

import dynamic from "next/dynamic";
import { useDashboardData } from "@/hooks/useDashboardData";

const BacktestSection = dynamic(
  () =>
    import("@/components/dashboard/BacktestSection").then((m) => ({
      default: m.BacktestSection,
    })),
  { ssr: false, loading: () => <div className="h-[420px] w-full rounded-xl bg-muted animate-pulse" /> },
);

export default function BacktestPage() {
  const { journalTrades, accountsById, userId, refreshData } = useDashboardData();

  const backtestAccounts = Array.from(accountsById.values())
    .filter((a) => a.kind === "backtest")
    .map((a) => ({
      id: a.id,
      name: a.name,
      is_active: a.is_active,
      starting_balance_usd:
        a.starting_balance_usd != null ? Number(a.starting_balance_usd) : null,
    }));

  const backtestTrades = journalTrades
    .filter((t) => {
      const acc = accountsById.get(t.account_id ?? "");
      return acc?.kind === "backtest" && t.opened_at && t.net_pnl_usd !== null;
    })
    .map((t) => ({
      id: t.id,
      account_id: t.account_id as string,
      pnl_usd: t.net_pnl_usd ?? 0,
      net_pnl_usd: t.net_pnl_usd ?? 0,
      opened_at: t.opened_at as string,
      symbol: t.symbol ?? "",
      direction: t.direction ?? "long",
      rr_realized: t.rr_realized ?? null,
    }));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Backtest</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contas de simulação e registro de estratégias sendo testadas.
        </p>
      </div>

      <BacktestSection
        accounts={backtestAccounts}
        trades={backtestTrades}
        userId={userId}
        onTradeAdded={refreshData}
      />
    </div>
  );
}
