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

// Session windows mapped from BRT (UTC-3, year-round) to UTC:
//   Tóquio (Asiática, Sydney+Tokyo): 18:00–05:00 BRT = 21:00–08:00 UTC
//   Londres (Europeia):              04:00–13:00 BRT = 07:00–16:00 UTC
//   Nova York (Americana):           08:00–18:00 BRT = 11:00–21:00 UTC (07:00–17:00 NY EDT)
// Classification = primary session (non-overlapping), NY wins overlap (highest volume).
function classifySession(utcHour: number): "tokyo" | "london" | "new-york" | null {
  // 21:00–24:00 UTC: Sydney open (Asian session start).
  if (utcHour >= 21) return "tokyo";
  // 00:00–07:00 UTC: Tokyo + Sydney overlap (Asian session core).
  if (utcHour >= 0 && utcHour < 7) return "tokyo";
  // 07:00–11:00 UTC: London-only window (post-Asian, pre-NY).
  if (utcHour >= 7 && utcHour < 11) return "london";
  // 11:00–21:00 UTC: NY-priority window. London-NY overlap (11–16 UTC) goes to NY.
  if (utcHour >= 11 && utcHour < 21) return "new-york";
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
      { name: "Tóquio", hours: "18:00–05:00 BRT", ...stats.tokyo },
      { name: "Londres", hours: "04:00–13:00 BRT", ...stats.london },
      { name: "Nova York", hours: "08:00–18:00 BRT", ...stats["new-york"] },
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
