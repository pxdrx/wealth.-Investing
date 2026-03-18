"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { JournalTradeRow, getNetPnl } from "@/components/journal/types";
import { Target } from "lucide-react";

interface MfeMaeScatterProps {
  trades: JournalTradeRow[];
  type: "mae-vs-pnl" | "mfe-vs-pnl";
}

interface ScatterPoint {
  x: number;
  y: number;
  symbol: string;
  isWin: boolean;
}

export function MfeMaeScatter({ trades, type }: MfeMaeScatterProps) {
  const { wins, losses, totalWithData, totalTrades } = useMemo(() => {
    const withData = trades.filter((t) =>
      type === "mae-vs-pnl"
        ? t.mae_usd != null && t.mae_usd !== 0
        : t.mfe_usd != null && t.mfe_usd !== 0
    );

    const winPts: ScatterPoint[] = [];
    const lossPts: ScatterPoint[] = [];

    for (const t of withData) {
      const pnl = getNetPnl(t);
      const xVal = type === "mae-vs-pnl" ? Math.abs(t.mae_usd ?? 0) : (t.mfe_usd ?? 0);
      const pt: ScatterPoint = { x: xVal, y: pnl, symbol: t.symbol, isWin: pnl > 0 };
      if (pnl > 0) winPts.push(pt);
      else lossPts.push(pt);
    }

    return { wins: winPts, losses: lossPts, totalWithData: withData.length, totalTrades: trades.length };
  }, [trades, type]);

  const xLabel = type === "mae-vs-pnl" ? "MAE (USD)" : "MFE (USD)";
  const title = type === "mae-vs-pnl" ? "MAE vs P&L" : "MFE vs P&L";

  if (totalWithData < 10) {
    return (
      <div
        className="rounded-[22px] p-8 text-center isolate"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">
          Dados insuficientes. Preencha MFE/MAE em pelo menos 10 trades.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {totalWithData} de {totalTrades} trades com dados
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[22px] p-5 isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[10px] text-muted-foreground rounded-full px-2 py-0.5 bg-muted/50">
          {totalWithData} de {totalTrades} trades com dados
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fontSize: 10 }}
            label={{ value: xLabel, position: "bottom", fontSize: 10, offset: 0 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="P&L (USD)"
            tick={{ fontSize: 10 }}
            label={{ value: "P&L (USD)", angle: -90, position: "insideLeft", fontSize: 10 }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const d = payload[0].payload as ScatterPoint;
              return (
                <div
                  className="rounded-lg border border-border/50 px-3 py-2 text-xs shadow-md"
                  style={{ backgroundColor: "hsl(var(--card))" }}
                >
                  <p className="font-medium">{d.symbol}</p>
                  <p>{xLabel}: ${d.x.toFixed(2)}</p>
                  <p>P&L: ${d.y.toFixed(2)}</p>
                </div>
              );
            }}
          />
          <Scatter name="Wins" data={wins} fill="#22c55e" opacity={0.7} />
          <Scatter name="Losses" data={losses} fill="#ef4444" opacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Exit Efficiency Chart ──────────────────────────────────────────

interface ExitEfficiencyChartProps {
  trades: JournalTradeRow[];
}

interface EfficiencyPoint {
  index: number;
  date: string;
  efficiency: number;
  rolling: number | null;
  symbol: string;
}

export function ExitEfficiencyChart({ trades }: ExitEfficiencyChartProps) {
  const data = useMemo(() => {
    const winningWithMfe = trades
      .filter((t) => getNetPnl(t) > 0 && t.mfe_usd != null && t.mfe_usd > 0)
      .sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());

    const points: EfficiencyPoint[] = winningWithMfe.map((t, i) => ({
      index: i,
      date: t.closed_at.slice(0, 10),
      efficiency: (getNetPnl(t) / (t.mfe_usd ?? 1)) * 100,
      rolling: null,
      symbol: t.symbol,
    }));

    // 10-trade rolling average
    const window = 10;
    for (let i = 0; i < points.length; i++) {
      if (i >= window - 1) {
        let sum = 0;
        for (let j = i - window + 1; j <= i; j++) sum += points[j].efficiency;
        points[i].rolling = sum / window;
      }
    }

    return points;
  }, [trades]);

  if (data.length < 10) {
    return (
      <div
        className="rounded-[22px] p-8 text-center isolate"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <h3 className="text-sm font-semibold mb-1">Exit Efficiency</h3>
        <p className="text-xs text-muted-foreground">
          Minimo 10 trades vencedores com MFE preenchido.
        </p>
      </div>
    );
  }

  const avgEfficiency = data.reduce((s, d) => s + d.efficiency, 0) / data.length;

  return (
    <div
      className="rounded-[22px] p-5 isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Exit Efficiency (P&L / MFE)</h3>
        <span className="text-[10px] text-muted-foreground rounded-full px-2 py-0.5 bg-muted/50">
          Media: {avgEfficiency.toFixed(1)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis type="number" dataKey="index" tick={{ fontSize: 10 }} label={{ value: "Trade #", position: "bottom", fontSize: 10 }} />
          <YAxis type="number" dataKey="efficiency" tick={{ fontSize: 10 }} domain={[0, 120]} label={{ value: "%", angle: -90, position: "insideLeft", fontSize: 10 }} />
          <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "100%", fontSize: 9 }} />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const d = payload[0].payload as EfficiencyPoint;
              return (
                <div
                  className="rounded-lg border border-border/50 px-3 py-2 text-xs shadow-md"
                  style={{ backgroundColor: "hsl(var(--card))" }}
                >
                  <p className="font-medium">{d.symbol} ({d.date})</p>
                  <p>Efficiency: {d.efficiency.toFixed(1)}%</p>
                  {d.rolling != null && <p>Rolling avg: {d.rolling.toFixed(1)}%</p>}
                </div>
              );
            }}
          />
          <Scatter name="Efficiency" data={data} fill="#3b82f6" opacity={0.6} />
          <Scatter
            name="Rolling Avg"
            data={data.filter((d) => d.rolling != null)}
            fill="#f59e0b"
            line={{ stroke: "#f59e0b", strokeWidth: 2 }}
            shape={() => <></>}
            dataKey="rolling"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── MFE/MAE Distribution (Histogram) ──────────────────────────────

import {
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface MfeMaeDistributionProps {
  trades: JournalTradeRow[];
}

interface BucketPoint {
  range: string;
  mfeCount: number;
  maeCount: number;
}

export function MfeMaeDistribution({ trades }: MfeMaeDistributionProps) {
  const data = useMemo(() => {
    const mfeValues = trades.filter((t) => t.mfe_usd != null).map((t) => t.mfe_usd!);
    const maeValues = trades.filter((t) => t.mae_usd != null).map((t) => Math.abs(t.mae_usd!));

    if (mfeValues.length < 5 && maeValues.length < 5) return [];

    const allValues = [...mfeValues, ...maeValues];
    const maxVal = Math.max(...allValues, 1);
    const bucketSize = Math.ceil(maxVal / 10);
    const buckets: BucketPoint[] = [];

    for (let i = 0; i < 10; i++) {
      const lo = i * bucketSize;
      const hi = (i + 1) * bucketSize;
      buckets.push({
        range: `$${lo}-${hi}`,
        mfeCount: mfeValues.filter((v) => v >= lo && v < hi).length,
        maeCount: maeValues.filter((v) => v >= lo && v < hi).length,
      });
    }

    return buckets;
  }, [trades]);

  if (data.length === 0) {
    return (
      <div
        className="rounded-[22px] p-8 text-center isolate"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <h3 className="text-sm font-semibold mb-1">Distribuicao MFE/MAE</h3>
        <p className="text-xs text-muted-foreground">Dados insuficientes.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[22px] p-5 isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Distribuicao MFE vs MAE</h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> MFE
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> MAE
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis dataKey="range" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "11px",
            }}
          />
          <Bar dataKey="mfeCount" name="MFE" fill="#22c55e" opacity={0.8} radius={[4, 4, 0, 0]} />
          <Bar dataKey="maeCount" name="MAE" fill="#ef4444" opacity={0.8} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
