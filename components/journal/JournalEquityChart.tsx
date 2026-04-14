"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { toForexDateKey } from "@/lib/trading/forex-day";
import { filterTradesByPeriod, getNetPnl } from "./types";
import type { JournalTradeRow } from "./types";
import type { PeriodFilter } from "./types";

interface JournalEquityChartProps {
  trades: JournalTradeRow[];
  period: PeriodFilter;
  startingBalanceUsd: number | null;
  maxOverallLossPercent?: number | null;
  profitTargetPercent?: number | null;
}

export function JournalEquityChart({ trades, period, startingBalanceUsd, maxOverallLossPercent, profitTargetPercent }: JournalEquityChartProps) {
  const { hidden, mask } = usePrivacy();
  const filtered = useMemo(() => filterTradesByPeriod(trades, period), [trades, period]);
  const start = startingBalanceUsd ?? 0;

  const isPropAccount = !!(maxOverallLossPercent && profitTargetPercent && start > 0);
  const ddLimit = isPropAccount ? start * (1 - maxOverallLossPercent! / 100) : null;
  const targetLimit = isPropAccount ? start * (1 + profitTargetPercent! / 100) : null;

  const data = useMemo(() => {
    const points: { date: string; equity: number; fullDate: string }[] = [];
    let cum = start;
    points.push({
      date: "Início",
      fullDate: "—",
      equity: cum,
    });
    const sorted = [...filtered].sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime());
    for (const t of sorted) {
      cum += getNetPnl(t);
      // Anchor the label to the forex-day so trades in the same 17:00-ET
      // session share the same "dd/mon" tick on the axis.
      const forexDay = toForexDateKey(t.opened_at);
      const d = new Date(`${forexDay}T12:00:00Z`);
      points.push({
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }),
        fullDate: new Date(t.opened_at).toLocaleString("pt-BR"),
        equity: Math.round(cum * 100) / 100,
      });
    }
    return points;
  }, [filtered, start]);

  const currentEquity = data.length > 0 ? data[data.length - 1].equity : start;
  const lineColor = currentEquity >= start ? "#059669" : "#dc2626"; // emerald-600 / red-600

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Curva de equity</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length <= 1 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum trade no período. Equity: {mask(`${start.toFixed(2)} USD`)}
          </p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) => hidden ? "••••" : `${v.toFixed(0)}`}
                  domain={isPropAccount ? [ddLimit! * 0.998, targetLimit! * 1.002] : ["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="rounded-input border border-border bg-card px-3 py-2 text-sm shadow-sm">
                        <p className="text-muted-foreground">{p.fullDate}</p>
                        <p className="font-semibold text-foreground">Equity: {mask(`${p.equity.toFixed(2)} USD`)}</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                {isPropAccount && ddLimit != null && (
                  <ReferenceLine
                    y={ddLimit}
                    stroke="#dc2626"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{ value: `DD ${maxOverallLossPercent}%`, position: "insideBottomRight", fontSize: 10, fill: "#dc2626" }}
                  />
                )}
                {isPropAccount && targetLimit != null && (
                  <ReferenceLine
                    y={targetLimit}
                    stroke="#059669"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{ value: `Meta ${profitTargetPercent}%`, position: "insideTopRight", fontSize: 10, fill: "#059669" }}
                  />
                )}
                {isPropAccount && (
                  <ReferenceLine
                    y={start}
                    stroke="#6b7280"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
