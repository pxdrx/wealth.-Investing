"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  SymbolBreakdownItem,
  DirectionBreakdownItem,
  DayOfWeekBreakdownItem,
  SessionBreakdownItem,
  HourBreakdownItem,
} from "@/lib/trade-analytics";

const cardStyle = {
  backgroundColor: "hsl(var(--card))",
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

// ── Symbol Breakdown ────────────────────────────────────────────────

interface SymbolBreakdownProps {
  data: SymbolBreakdownItem[];
}

export function SymbolBreakdown({ data }: SymbolBreakdownProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate" style={cardStyle}>
      <h3 className="text-sm font-semibold">Por Ativo</h3>
      <p className="text-xs text-muted-foreground mb-4">P&L e win rate agrupados por instrumento</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.slice(0, 10)} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
          <YAxis type="category" dataKey="symbol" tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, "P&L Total"]} />
          <Bar dataKey="totalPnl">
            {data.slice(0, 10).map((entry, index) => (
              <Cell key={index} fill={entry.totalPnl >= 0 ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Direction Breakdown ─────────────────────────────────────────────

interface DirectionBreakdownProps {
  data: DirectionBreakdownItem[];
}

export function DirectionBreakdown({ data }: DirectionBreakdownProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  const pieData = data.map((d, i) => ({
    name: d.direction === "buy" ? "Long" : "Short",
    value: d.tradeCount,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate" style={cardStyle}>
      <h3 className="text-sm font-semibold">Por Direção</h3>
      <p className="text-xs text-muted-foreground mb-4">Comparativo de performance entre compras e vendas</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }: { name: string; percent: number }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {pieData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Day of Week Breakdown ───────────────────────────────────────────

interface DayOfWeekBreakdownProps {
  data: DayOfWeekBreakdownItem[];
}

export function DayOfWeekBreakdown({ data }: DayOfWeekBreakdownProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate" style={cardStyle}>
      <h3 className="text-sm font-semibold">Por Dia da Semana</h3>
      <p className="text-xs text-muted-foreground mb-4">Seus melhores e piores dias para operar</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
          <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, "Avg P&L"]} />
          <Bar dataKey="avgPnl">
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.avgPnl >= 0 ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Session Breakdown ───────────────────────────────────────────────

interface SessionBreakdownProps {
  data: SessionBreakdownItem[];
}

export function SessionBreakdown({ data }: SessionBreakdownProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate" style={cardStyle}>
      <h3 className="text-sm font-semibold">Por Sessão</h3>
      <p className="text-xs text-muted-foreground mb-4">Performance por sessão de mercado (Tokyo, London, NY)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="session" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
          <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, "P&L Total"]} />
          <Bar dataKey="totalPnl">
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Hour Heatmap ────────────────────────────────────────────────────

interface HourHeatmapProps {
  data: HourBreakdownItem[];
}

export function HourHeatmap({ data }: HourHeatmapProps) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  const maxCount = Math.max(...data.map((d) => d.tradeCount), 1);

  return (
    <div className="rounded-[22px] p-5 shadow-soft dark:shadow-soft-dark isolate" style={cardStyle}>
      <h3 className="text-sm font-semibold">Por Hora (UTC)</h3>
      <p className="text-xs text-muted-foreground mb-4">Distribuição de trades e P&L por hora do dia</p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 24 }, (_, h) => {
          const item = data.find((d) => d.hour === h);
          const count = item?.tradeCount ?? 0;
          const intensity = count / maxCount;
          const bg = count === 0
            ? "hsl(var(--muted))"
            : `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`;
          return (
            <div
              key={h}
              className="flex flex-col items-center justify-center rounded-lg text-[10px] w-10 h-10"
              style={{ backgroundColor: bg }}
              title={`${h}h UTC: ${count} trades, WR ${item?.winRate.toFixed(0) ?? 0}%`}
            >
              <span className="font-medium">{h}h</span>
              <span>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
