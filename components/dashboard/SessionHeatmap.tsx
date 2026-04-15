"use client";

import { useMemo } from "react";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { formatPnl } from "@/components/calendar/utils";

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

function classifySession(utcHour: number): "tokyo" | "london" | "new-york" | null {
  // Tokyo: 00:00-08:00 UTC
  if (utcHour >= 0 && utcHour < 8) return "tokyo";
  // London: 07:00-15:00 UTC (overlap with Tokyo 07-08)
  if (utcHour >= 7 && utcHour < 15) return "london";
  // New York: 13:00-21:00 UTC (overlap with London 13-15)
  if (utcHour >= 13 && utcHour < 21) return "new-york";
  return null;
}

export function SessionHeatmap({ trades }: SessionHeatmapProps) {
  const { mask } = usePrivacy();

  const sessions = useMemo(() => {
    const stats: Record<string, { pnl: number; trades: number; wins: number }> = {
      tokyo: { pnl: 0, trades: 0, wins: 0 },
      london: { pnl: 0, trades: 0, wins: 0 },
      "new-york": { pnl: 0, trades: 0, wins: 0 },
    };

    for (const t of trades) {
      if (!t.opened_at || t.net_pnl_usd === null) continue;
      const d = new Date(t.opened_at);
      if (Number.isNaN(d.getTime())) continue;
      const utcHour = d.getUTCHours();

      // A trade can belong to overlapping sessions — assign to primary
      const session = classifySession(utcHour);
      if (!session) continue;

      stats[session].pnl += t.net_pnl_usd;
      stats[session].trades += 1;
      if (t.net_pnl_usd > 0) stats[session].wins += 1;
    }

    const result: SessionStats[] = [
      { name: "Tóquio", hours: "00:00–08:00 UTC", ...stats.tokyo },
      { name: "Londres", hours: "07:00–15:00 UTC", ...stats.london },
      { name: "Nova York", hours: "13:00–21:00 UTC", ...stats["new-york"] },
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
