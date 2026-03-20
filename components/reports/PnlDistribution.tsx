"use client";

import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from "recharts";

interface PnlDistributionProps {
  pnls: number[];
}

function buildHistogram(pnls: number[]): { range: string; count: number; isPositive: boolean; lo: number; hi: number }[] {
  if (pnls.length === 0) return [];
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  const bucketCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(pnls.length))));
  const bucketSize = (max - min) / bucketCount || 1;

  const buckets: { range: string; count: number; isPositive: boolean; lo: number; hi: number }[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const lo = min + i * bucketSize;
    const hi = lo + bucketSize;
    const mid = (lo + hi) / 2;
    buckets.push({
      range: `$${Math.round(lo)}`,
      count: pnls.filter((p) => p >= lo && (i === bucketCount - 1 ? p <= hi : p < hi)).length,
      isPositive: mid >= 0,
      lo,
      hi,
    });
  }
  return buckets;
}

function formatUsd(v: number): string {
  return v >= 0 ? `$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`;
}

export function PnlDistribution({ pnls }: PnlDistributionProps) {
  const data = buildHistogram(pnls);

  const stats = useMemo(() => {
    if (pnls.length === 0) return null;
    const sorted = [...pnls].sort((a, b) => a - b);
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    return { mean, median };
  }, [pnls]);

  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div
      className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Distribuição de P&L</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Frequência de trades por faixa de resultado (USD).
          {stats && (
            <> Média: <span className={stats.mean >= 0 ? "text-emerald-500" : "text-red-500"}>{formatUsd(stats.mean)}</span> · Mediana: <span className={stats.median >= 0 ? "text-emerald-500" : "text-red-500"}>{formatUsd(stats.median)}</span></>
          )}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 10 }}
            label={{ value: "Faixa de P&L (USD)", position: "insideBottom", offset: -12, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            allowDecimals={false}
            label={{ value: "Número de trades", angle: -90, position: "insideLeft", offset: 0, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            formatter={(value: number) => [value, "Trades"]}
            labelFormatter={(label: string, payload) => {
              if (payload && payload.length > 0) {
                const item = payload[0].payload as { lo: number; hi: number };
                return `$${Math.round(item.lo)} a $${Math.round(item.hi)}`;
              }
              return label;
            }}
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
          />
          {stats && (
            <ReferenceLine
              x={data.reduce((closest, d) => {
                const dMid = (d.lo + d.hi) / 2;
                const cMid = (closest.lo + closest.hi) / 2;
                return Math.abs(dMid - stats.mean) < Math.abs(cMid - stats.mean) ? d : closest;
              }, data[0]).range}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{ value: "Média", position: "top", fontSize: 10, fill: "#f59e0b" }}
            />
          )}
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.isPositive ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
