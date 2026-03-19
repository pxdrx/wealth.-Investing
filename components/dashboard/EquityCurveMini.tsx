"use client";

import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { usePrivacy } from "@/components/context/PrivacyContext";
import { formatPnl } from "@/components/calendar/utils";

interface EquityCurveMiniProps {
  trades: { net_pnl_usd: number | null; opened_at: string | null }[];
  startingBalanceUsd?: number | null;
}

export function EquityCurveMini({ trades, startingBalanceUsd }: EquityCurveMiniProps) {
  const { hidden, mask } = usePrivacy();

  const baseBalance = startingBalanceUsd ?? 0;

  const equityData = useMemo(() => {
    const valid = trades
      .filter((t) => t.opened_at !== null && t.net_pnl_usd !== null)
      .sort((a, b) => a.opened_at!.localeCompare(b.opened_at!));

    if (valid.length === 0) return [];

    // Aggregate by day
    const byDay = new Map<string, number>();
    for (const t of valid) {
      const day = t.opened_at!.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (t.net_pnl_usd ?? 0));
    }

    const days = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let cumulative = baseBalance;
    return days.map(([date, pnl]) => {
      cumulative += pnl;
      return { date, value: cumulative };
    });
  }, [trades, baseBalance]);

  const startVal = equityData.length > 0 ? equityData[0].value : baseBalance;
  const endVal = equityData.length > 0 ? equityData[equityData.length - 1].value : baseBalance;
  const isPositive = endVal >= baseBalance;

  const strokeColor = isPositive ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))";

  return (
    <div
      className="rounded-[22px] border overflow-hidden"
      style={{
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Curva de Equity
        </h3>
        <div className="flex items-center gap-3 text-xs tabular-nums">
          <span className="text-muted-foreground">
            Início: <span className="font-medium text-foreground">{mask(formatPnl(startVal))}</span>
          </span>
          <span className="text-muted-foreground">
            Atual:{" "}
            <span
              className="font-medium"
              style={{ color: isPositive ? "hsl(var(--pnl-positive))" : "hsl(var(--pnl-negative))" }}
            >
              {mask(formatPnl(endVal))}
            </span>
          </span>
        </div>
      </div>

      <div className="px-3 py-4">
        {equityData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={equityData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                  padding: "6px 10px",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "10px" }}
                formatter={(value: number) => [hidden ? "••••" : formatPnl(value), "Saldo"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 1.5, fill: "hsl(var(--card))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[100px]">
            <span className="text-xs text-muted-foreground">Dados insuficientes</span>
          </div>
        )}
      </div>
    </div>
  );
}
