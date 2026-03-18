"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

interface PnlDistributionProps {
  pnls: number[];
}

function buildHistogram(pnls: number[]): { range: string; count: number; isPositive: boolean }[] {
  if (pnls.length === 0) return [];
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  const bucketCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(pnls.length))));
  const bucketSize = (max - min) / bucketCount || 1;

  const buckets: { range: string; count: number; isPositive: boolean }[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const lo = min + i * bucketSize;
    const hi = lo + bucketSize;
    const mid = (lo + hi) / 2;
    buckets.push({
      range: `$${Math.round(lo)}`,
      count: pnls.filter((p) => p >= lo && (i === bucketCount - 1 ? p <= hi : p < hi)).length,
      isPositive: mid >= 0,
    });
  }
  return buckets;
}

export function PnlDistribution({ pnls }: PnlDistributionProps) {
  const data = buildHistogram(pnls);
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div
      className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <h3 className="text-sm font-semibold mb-4">Distribuicao de P&L</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="range" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count">
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.isPositive ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
