// [C-13] Aggregates per-firm rollups over the user's prop accounts.
"use client";

import { useMemo } from "react";
import { Building2, TrendingUp, Wallet } from "lucide-react";
import type { PropAccountRow } from "@/lib/accounts";
import type { PropCycleStats, DrawdownStats } from "@/lib/prop-stats";

interface PropFirmCardInput {
  accountId: string;
  accountName: string;
  propInfo: PropAccountRow;
  cycleStats: PropCycleStats;
  drawdownStats: DrawdownStats | null;
}

interface FirmRollup {
  firm: string;
  accountCount: number;
  totalStartingBalance: number;
  totalHistorical: number;
  totalProfitSinceLastPayout: number;
  worstDrawdownPct: number;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PropFirmsOverview({ cards }: { cards: PropFirmCardInput[] }) {
  const rollups = useMemo<FirmRollup[]>(() => {
    const map = new Map<string, FirmRollup>();
    for (const card of cards) {
      const firm = card.propInfo.firm_name || "Outras";
      const existing = map.get(firm) ?? {
        firm,
        accountCount: 0,
        totalStartingBalance: 0,
        totalHistorical: 0,
        totalProfitSinceLastPayout: 0,
        worstDrawdownPct: 0,
      };
      existing.accountCount += 1;
      existing.totalStartingBalance += Number(card.propInfo.starting_balance_usd ?? 0);
      existing.totalHistorical += card.cycleStats.totalHistorical;
      existing.totalProfitSinceLastPayout += Math.max(0, card.cycleStats.profitSinceLastPayout);
      const dd = card.drawdownStats?.overallDdPct ?? 0;
      if (dd > existing.worstDrawdownPct) existing.worstDrawdownPct = dd;
      map.set(firm, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.totalStartingBalance - a.totalStartingBalance);
  }, [cards]);

  if (rollups.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Por Firma
        </h2>
        <span className="text-[11px] text-muted-foreground/70">
          {rollups.length} {rollups.length === 1 ? "firma" : "firmas"}
        </span>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {rollups.map((r) => {
          const netPctVsStart = r.totalStartingBalance > 0
            ? (r.totalHistorical / r.totalStartingBalance) * 100
            : 0;
          const netPositive = r.totalHistorical >= 0;
          return (
            <div
              key={r.firm}
              className="rounded-[22px] border border-border/60 p-5 isolate"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {r.firm}
                </h3>
                <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {r.accountCount} {r.accountCount === 1 ? "conta" : "contas"}
                </span>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Wallet className="h-3.5 w-3.5" /> Alocado
                  </dt>
                  <dd className="font-semibold text-foreground tabular-nums">
                    {formatUsd(r.totalStartingBalance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <TrendingUp className="h-3.5 w-3.5" /> PnL Total
                  </dt>
                  <dd className={`font-semibold tabular-nums ${netPositive ? "text-emerald-500" : "text-red-500"}`}>
                    {netPositive ? "+" : ""}{formatUsd(r.totalHistorical)}
                    <span className="ml-1 text-[11px] text-muted-foreground">
                      ({netPositive ? "+" : ""}{netPctVsStart.toFixed(1)}%)
                    </span>
                  </dd>
                </div>
                {r.totalProfitSinceLastPayout > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground text-xs">Elegível p/ payout</dt>
                    <dd className="font-semibold tabular-nums text-emerald-500">
                      {formatUsd(r.totalProfitSinceLastPayout)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground text-xs">Pior drawdown</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {r.worstDrawdownPct.toFixed(1)}%
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
