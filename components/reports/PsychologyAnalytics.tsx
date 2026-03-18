"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JournalTradeRow } from "@/components/journal/types";
import { getNetPnl } from "@/components/journal/types";
import { EMOTION_TAGS, DISCIPLINE_TAGS, SETUP_QUALITY, getEmotionTag, getDisciplineTag, getSetupQuality } from "@/lib/psychology-tags";

interface PsychologyAnalyticsProps {
  trades: JournalTradeRow[];
}

const CHART_COLORS = [
  "#22c55e", "#3b82f6", "#eab308", "#ef4444", "#8b5cf6",
  "#f97316", "#06b6d4", "#ec4899", "#14b8a6", "#f43f5e",
  "#6366f1", "#84cc16", "#a855f7", "#0ea5e9",
];

export function PsychologyAnalytics({ trades }: PsychologyAnalyticsProps) {
  // ── Win Rate by Emotion ──
  const winRateByEmotion = useMemo(() => {
    const groups = new Map<string, { wins: number; total: number }>();
    for (const t of trades) {
      if (!t.emotion) continue;
      const g = groups.get(t.emotion) ?? { wins: 0, total: 0 };
      g.total++;
      if (getNetPnl(t) > 0) g.wins++;
      groups.set(t.emotion, g);
    }
    return Array.from(groups.entries())
      .map(([key, { wins, total }]) => {
        const tag = getEmotionTag(key);
        return {
          name: tag ? `${tag.icon} ${tag.labelPtBr}` : key,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
          trades: total,
        };
      })
      .sort((a, b) => b.winRate - a.winRate);
  }, [trades]);

  // ── Avg PnL by Emotion ──
  const avgPnlByEmotion = useMemo(() => {
    const groups = new Map<string, { sum: number; count: number }>();
    for (const t of trades) {
      if (!t.emotion) continue;
      const g = groups.get(t.emotion) ?? { sum: 0, count: 0 };
      g.sum += getNetPnl(t);
      g.count++;
      groups.set(t.emotion, g);
    }
    return Array.from(groups.entries())
      .map(([key, { sum, count }]) => {
        const tag = getEmotionTag(key);
        return {
          name: tag ? `${tag.icon} ${tag.labelPtBr}` : key,
          avgPnl: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
        };
      })
      .sort((a, b) => b.avgPnl - a.avgPnl);
  }, [trades]);

  // ── Discipline Distribution (donut) ──
  const disciplineDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of trades) {
      if (!t.discipline) continue;
      counts.set(t.discipline, (counts.get(t.discipline) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([key, count]) => {
        const tag = getDisciplineTag(key);
        return {
          name: tag ? `${tag.icon} ${tag.labelPtBr}` : key,
          value: count,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [trades]);

  // ── Mistake Cost Table ──
  const mistakeCosts = useMemo(() => {
    const map = new Map<string, { count: number; totalPnl: number }>();
    for (const t of trades) {
      if (!t.discipline) continue;
      const tag = getDisciplineTag(t.discipline);
      if (!tag || tag.sentiment >= 0) continue; // only negative discipline = mistakes
      const g = map.get(t.discipline) ?? { count: 0, totalPnl: 0 };
      g.count++;
      g.totalPnl += getNetPnl(t);
      map.set(t.discipline, g);
    }
    return Array.from(map.entries())
      .map(([key, { count, totalPnl }]) => {
        const tag = getDisciplineTag(key);
        return {
          name: tag ? `${tag.icon} ${tag.labelPtBr}` : key,
          count,
          totalPnl: Math.round(totalPnl * 100) / 100,
          avgPnl: Math.round((totalPnl / count) * 100) / 100,
        };
      })
      .sort((a, b) => a.totalPnl - b.totalPnl); // worst first
  }, [trades]);

  // ── Setup Quality vs Outcome ──
  const setupOutcome = useMemo(() => {
    const groups = new Map<string, { wins: number; losses: number; totalPnl: number }>();
    for (const t of trades) {
      if (!t.setup_quality) continue;
      const g = groups.get(t.setup_quality) ?? { wins: 0, losses: 0, totalPnl: 0 };
      const net = getNetPnl(t);
      if (net > 0) g.wins++;
      else if (net < 0) g.losses++;
      g.totalPnl += net;
      groups.set(t.setup_quality, g);
    }
    return SETUP_QUALITY.filter((sq) => groups.has(sq.key)).map((sq) => {
      const g = groups.get(sq.key)!;
      return {
        name: sq.label,
        wins: g.wins,
        losses: g.losses,
        avgPnl: Math.round((g.totalPnl / (g.wins + g.losses)) * 100) / 100,
      };
    });
  }, [trades]);

  const hasPsychData = trades.some((t) => t.emotion || t.discipline || t.setup_quality);

  if (!hasPsychData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum dado psicologico registrado. Abra um trade e adicione emocoes e disciplina.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Win Rate by Emotion */}
      {winRateByEmotion.length > 0 && (
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardHeader>
            <CardTitle className="text-base font-medium">Win Rate por Emocao</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, winRateByEmotion.length * 36)}>
              <BarChart data={winRateByEmotion} layout="vertical" margin={{ left: 100, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="winRate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Avg PnL by Emotion */}
      {avgPnlByEmotion.length > 0 && (
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardHeader>
            <CardTitle className="text-base font-medium">PnL Medio por Emocao</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, avgPnlByEmotion.length * 36)}>
              <BarChart data={avgPnlByEmotion} layout="vertical" margin={{ left: 100, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Bar
                  dataKey="avgPnl"
                  radius={[0, 4, 4, 0]}
                  fill="#22c55e"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Discipline Distribution Donut */}
        {disciplineDistribution.length > 0 && (
          <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
            <CardHeader>
              <CardTitle className="text-base font-medium">Distribuicao de Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={disciplineDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {disciplineDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Setup Quality vs Outcome */}
        {setupOutcome.length > 0 && (
          <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
            <CardHeader>
              <CardTitle className="text-base font-medium">Setup Quality vs Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={setupOutcome}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="wins" name="Wins" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mistake Cost Table */}
      {mistakeCosts.length > 0 && (
        <Card className="rounded-[22px]" style={{ backgroundColor: "hsl(var(--card))" }}>
          <CardHeader>
            <CardTitle className="text-base font-medium">Custo dos Erros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Erro</th>
                    <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">Ocorrencias</th>
                    <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">PnL Total</th>
                    <th className="py-2 pl-4 text-right text-xs font-medium text-muted-foreground">PnL Medio</th>
                  </tr>
                </thead>
                <tbody>
                  {mistakeCosts.map((m) => (
                    <tr key={m.name} className="border-b border-border/30">
                      <td className="py-2 pr-4 font-medium">{m.name}</td>
                      <td className="py-2 px-4 text-right text-muted-foreground">{m.count}</td>
                      <td className={`py-2 px-4 text-right font-medium ${m.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                        {m.totalPnl >= 0 ? "+" : ""}${m.totalPnl.toFixed(2)}
                      </td>
                      <td className={`py-2 pl-4 text-right ${m.avgPnl >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                        {m.avgPnl >= 0 ? "+" : ""}${m.avgPnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
