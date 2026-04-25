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
          {/* [H3] Drawdown values from trade-analytics are already <= 0; clamp domain so 0 sits at top and DD descends into negatives. */}
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${v <= 0 ? v.toFixed(1) : `-${v.toFixed(1)}`}%`}
            domain={[(dataMin: number) => Math.min(dataMin, 0), 0]}
            allowDataOverflow={false}
          />
          <Tooltip formatter={(v: number) => [`${(v <= 0 ? v : -v).toFixed(2)}%`, "Drawdown"]} />
          <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
