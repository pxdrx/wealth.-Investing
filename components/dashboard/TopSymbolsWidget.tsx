"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { formatPnl } from "@/components/calendar/utils";
import type { JournalTradeKpiRow } from "@/hooks/useDashboardData";

export function TopSymbolsWidget({ trades }: { trades: JournalTradeKpiRow[] }) {
  const { mask } = usePrivacy();

  const topSymbols = useMemo(() => {
    const bySymbol = new Map<string, { pnl: number; count: number }>();
    for (const t of trades) {
      if (!t.symbol) continue;
      const sym = t.symbol;
      const cur = bySymbol.get(sym) ?? { pnl: 0, count: 0 };
      cur.pnl += t.net_pnl_usd ?? 0;
      cur.count += 1;
      bySymbol.set(sym, cur);
    }
    return Array.from(bySymbol.entries())
      .map(([symbol, stats]) => ({ symbol, ...stats }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);
  }, [trades]);

  return (
    <div
      className="rounded-[22px] border overflow-hidden h-full flex flex-col"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Top Ativos
        </h3>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="px-5 py-3 flex-1">
        {topSymbols.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhum ativo registrado.
          </p>
        ) : (
          <ul className="space-y-2">
            {topSymbols.map((s, idx) => (
              <li key={s.symbol} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-medium text-muted-foreground w-4 text-right">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {s.symbol}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {mask(`${s.count}`)} trades
                  </span>
                </div>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{
                    color:
                      s.pnl > 0
                        ? "hsl(var(--pnl-positive))"
                        : s.pnl < 0
                          ? "hsl(var(--pnl-negative))"
                          : "hsl(var(--muted-foreground))",
                  }}
                >
                  {mask(formatPnl(s.pnl))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
