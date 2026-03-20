"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { DrawdownPoint } from "@/lib/trade-analytics";

interface DrawdownChartProps {
  data: DrawdownPoint[];
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div
      className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <h3 className="text-sm font-semibold">Drawdown</h3>
      <p className="text-xs text-muted-foreground mb-4">Queda percentual a partir do pico de equity</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
          <Tooltip formatter={(v: number) => [`${Number(v).toFixed(2)}%`, "Drawdown"]} />
          <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
