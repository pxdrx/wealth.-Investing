"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { DailyPnlPoint } from "@/lib/trade-analytics";

interface DailyPnlChartProps {
  data: DailyPnlPoint[];
}

export function DailyPnlChart({ data }: DailyPnlChartProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div
      className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <h3 className="text-sm font-semibold">P&L Diário</h3>
      <p className="text-xs text-muted-foreground mb-4">Resultado líquido por dia de operação</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
          <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, "P&L"]} />
          <Bar dataKey="pnl">
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
