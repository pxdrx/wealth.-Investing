"use client";

import { useMemo } from "react";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { formatPnl } from "@/components/calendar/utils";
import { getSession } from "@/lib/trade-analytics";

interface SessionHeatmapProps {
  trades: { net_pnl_usd: number | null; opened_at: string | null }[];
}

interface SessionStats {
  name: string;
  hours: string;
  pnl: number;
  trades: number;
  wins: number;
}

// Session windows in NY local time (America/New_York, DST-aware).
// User trades NY exclusively — cutoff = 7am NY.
//   Tóquio   : 0:00–2:59 NY
//   Londres  : 3:00–6:59 NY
//   Nova York: 7:00–23:59 NY (rest of NY day)
export function SessionHeatmap({ trades }: SessionHeatmapProps) {
  const { mask } = usePrivacy();

  const sessions = useMemo(() => {
    const stats: Record<"Tóquio" | "Londres" | "New York", { pnl: number; trades: number; wins: number }> = {
      "Tóquio": { pnl: 0, trades: 0, wins: 0 },
      "Londres": { pnl: 0, trades: 0, wins: 0 },
      "New York": { pnl: 0, trades: 0, wins: 0 },
    };

    for (const t of trades) {
      if (!t.opened_at || t.net_pnl_usd === null) continue;
      const d = new Date(t.opened_at);
      if (Number.isNaN(d.getTime())) continue;

      const session = getSession(d);
      stats[session].pnl += t.net_pnl_usd;
      stats[session].trades += 1;
      if (t.net_pnl_usd > 0) stats[session].wins += 1;
    }

    const result: SessionStats[] = [
      { name: "Tóquio",   hours: "0:00–2:59 NY",  ...stats["Tóquio"] },
      { name: "Londres",  hours: "3:00–6:59 NY",  ...stats["Londres"] },
      { name: "Nova York",hours: "7:00–23:59 NY", ...stats["New York"] },
    ];

    return result;
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
        className="px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Mapa de Sessões
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "hsl(var(--border))" }}>
        {sessions.map((s) => {
          const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
          const isProfit = s.pnl > 0;
          const isLoss = s.pnl < 0;

          return (
            <div
              key={s.name}
              className="px-4 py-4 flex flex-col items-center gap-2 text-center"
              style={{
                backgroundColor: isProfit
                  ? "hsl(var(--pnl-positive) / 0.06)"
                  : isLoss
                    ? "hsl(var(--pnl-negative) / 0.06)"
                    : undefined,
              }}
            >
              <span className="text-xs font-semibold text-foreground">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">{s.hours}</span>

              <span
                className="text-sm font-bold tabular-nums mt-1"
                style={{
                  color: isProfit
                    ? "hsl(var(--pnl-positive))"
                    : isLoss
                      ? "hsl(var(--pnl-negative))"
                      : "hsl(var(--muted-foreground))",
                }}
              >
                {mask(formatPnl(s.pnl))}
              </span>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{mask(`${s.trades}`)} trades</span>
                <span>·</span>
                <span>WR {mask(`${winRate.toFixed(0)}%`)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
