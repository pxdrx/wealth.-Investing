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
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JournalTradeRow } from "@/components/journal/types";
import { getNetPnl } from "@/components/journal/types";
import { EMOTION_TAGS, DISCIPLINE_TAGS, SETUP_QUALITY, getEmotionTag, getDisciplineTag } from "@/lib/psychology-tags";
import { AlertTriangle, Brain, TrendingDown } from "lucide-react";

interface PsychologyAnalyticsProps {
  trades: JournalTradeRow[];
}

const CHART_COLORS = [
  "#22c55e", "#3b82f6", "#eab308", "#ef4444", "#8b5cf6",
  "#f97316", "#06b6d4", "#ec4899", "#14b8a6", "#f43f5e",
  "#6366f1", "#84cc16", "#a855f7", "#0ea5e9",
];

const cardStyle = { backgroundColor: "hsl(var(--card))" };

export function PsychologyAnalytics({ trades }: PsychologyAnalyticsProps) {
  // ── Emotion Distribution (donut) ──
  const emotionDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of trades) {
      if (!t.emotion) continue;
      counts.set(t.emotion, (counts.get(t.emotion) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([key, count]) => {
        const tag = getEmotionTag(key);
        return {
          name: tag ? `${tag.icon} ${tag.labelPtBr}` : key,
          value: count,
        };
      })
      .sort((a, b) => b.value - a.value);
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
          key,
          avgPnl: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
          count,
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

  // ── Discipline Score Over Time (rolling average) ──
  const disciplineOverTime = useMemo(() => {
    const disciplineMap = new Map(DISCIPLINE_TAGS.map((t) => [t.key, t.sentiment]));
    const sorted = [...trades]
      .filter((t) => t.discipline)
      .sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());

    if (sorted.length < 3) return [];

    const windowSize = Math.min(10, Math.max(3, Math.floor(sorted.length / 3)));
    const points: { index: number; date: string; score: number; rolling: number | null }[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      const score = disciplineMap.get(t.discipline!) ?? 0;
      let rolling: number | null = null;
      if (i >= windowSize - 1) {
        let sum = 0;
        for (let j = i - windowSize + 1; j <= i; j++) {
          sum += disciplineMap.get(sorted[j].discipline!) ?? 0;
        }
        rolling = sum / windowSize;
      }
      points.push({
        index: i + 1,
        date: t.closed_at.slice(0, 10),
        score,
        rolling,
      });
    }
    return points;
  }, [trades]);

  // ── Tilt Detector: sequences of 3+ consecutive losses with negative emotions ──
  const tiltSequences = useMemo(() => {
    const emotionMap = new Map(EMOTION_TAGS.map((t) => [t.key, t.sentiment]));
    const sorted = [...trades].sort(
      (a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime()
    );

    const sequences: { startIdx: number; endIdx: number; trades: JournalTradeRow[]; totalLoss: number }[] = [];
    let current: JournalTradeRow[] = [];

    for (const t of sorted) {
      const pnl = getNetPnl(t);
      const emotionSentiment = t.emotion ? (emotionMap.get(t.emotion) ?? 0) : 0;

      if (pnl <= 0 && emotionSentiment <= 0) {
        current.push(t);
      } else {
        if (current.length >= 3) {
          sequences.push({
            startIdx: sorted.indexOf(current[0]),
            endIdx: sorted.indexOf(current[current.length - 1]),
            trades: [...current],
            totalLoss: current.reduce((s, ct) => s + getNetPnl(ct), 0),
          });
        }
        current = [];
      }
    }
    // Check last sequence
    if (current.length >= 3) {
      sequences.push({
        startIdx: sorted.indexOf(current[0]),
        endIdx: sorted.indexOf(current[current.length - 1]),
        trades: [...current],
        totalLoss: current.reduce((s, ct) => s + getNetPnl(ct), 0),
      });
    }

    return sequences;
  }, [trades]);

  // ── Performance Matrix: Emotion x Discipline ──
  const performanceMatrix = useMemo(() => {
    const matrix = new Map<string, { sum: number; count: number }>();
    for (const t of trades) {
      if (!t.emotion || !t.discipline) continue;
      const emotionTag = getEmotionTag(t.emotion);
      const discTag = getDisciplineTag(t.discipline);
      const eLabel = emotionTag ? emotionTag.labelPtBr : t.emotion;
      const dLabel = discTag ? discTag.labelPtBr : t.discipline;
      const key = `${eLabel}|${dLabel}`;
      const g = matrix.get(key) ?? { sum: 0, count: 0 };
      g.sum += getNetPnl(t);
      g.count++;
      matrix.set(key, g);
    }
    return Array.from(matrix.entries())
      .map(([key, { sum, count }]) => {
        const [emotion, discipline] = key.split("|");
        return { emotion, discipline, avgPnl: Math.round((sum / count) * 100) / 100, count };
      })
      .filter((r) => r.count >= 2)
      .sort((a, b) => b.avgPnl - a.avgPnl);
  }, [trades]);

  // ── Ratings Over Time ──
  const ratingsOverTime = useMemo(() => {
    const sorted = [...trades]
      .filter((t) =>
        typeof t.entry_rating === "number" ||
        typeof t.exit_rating === "number" ||
        typeof t.management_rating === "number"
      )
      .sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());

    if (sorted.length < 3) return [];

    const windowSize = Math.min(10, Math.max(3, Math.floor(sorted.length / 3)));

    return sorted.map((t, i, arr) => {
      let entryRolling: number | null = null;
      let exitRolling: number | null = null;
      let mgmtRolling: number | null = null;

      if (i >= windowSize - 1) {
        let eSum = 0, eCount = 0, xSum = 0, xCount = 0, mSum = 0, mCount = 0;
        for (let j = i - windowSize + 1; j <= i; j++) {
          if (typeof arr[j].entry_rating === "number") { eSum += arr[j].entry_rating!; eCount++; }
          if (typeof arr[j].exit_rating === "number") { xSum += arr[j].exit_rating!; xCount++; }
          if (typeof arr[j].management_rating === "number") { mSum += arr[j].management_rating!; mCount++; }
        }
        if (eCount > 0) entryRolling = eSum / eCount;
        if (xCount > 0) exitRolling = xSum / xCount;
        if (mCount > 0) mgmtRolling = mSum / mCount;
      }

      return {
        index: i + 1,
        date: t.closed_at.slice(0, 10),
        entry: entryRolling,
        exit: exitRolling,
        management: mgmtRolling,
      };
    });
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

  // ── Mistake Cost Table ──
  const mistakeCosts = useMemo(() => {
    const map = new Map<string, { count: number; totalPnl: number }>();
    for (const t of trades) {
      if (!t.discipline) continue;
      const tag = getDisciplineTag(t.discipline);
      if (!tag || tag.sentiment >= 0) continue;
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
      .sort((a, b) => a.totalPnl - b.totalPnl);
  }, [trades]);

  // ── Recommendations ──
  const recommendations = useMemo(() => {
    const recs: string[] = [];

    // Worst emotion by avg PnL
    const worstEmotion = avgPnlByEmotion.filter((e) => e.avgPnl < 0).sort((a, b) => a.avgPnl - b.avgPnl)[0];
    if (worstEmotion) {
      recs.push(
        `Seus trades em estado "${worstEmotion.name}" tem P&L medio de $${worstEmotion.avgPnl.toFixed(2)} em ${worstEmotion.count} trades. Considere nao operar nesse estado emocional.`
      );
    }

    // Best emotion
    const bestEmotion = avgPnlByEmotion.filter((e) => e.avgPnl > 0).sort((a, b) => b.avgPnl - a.avgPnl)[0];
    if (bestEmotion) {
      recs.push(
        `Seu melhor estado emocional e "${bestEmotion.name}" com P&L medio de +$${bestEmotion.avgPnl.toFixed(2)}. Procure operar mais nesse estado.`
      );
    }

    // Tilt detection
    if (tiltSequences.length > 0) {
      const totalTiltLoss = tiltSequences.reduce((s, seq) => s + seq.totalLoss, 0);
      recs.push(
        `Detectamos ${tiltSequences.length} periodo(s) de tilt (3+ losses consecutivos com emocoes negativas), totalizando $${totalTiltLoss.toFixed(2)} de prejuizo. Considere parar apos 3 losses consecutivos.`
      );
    }

    // Worst discipline mistake
    if (mistakeCosts.length > 0) {
      const worst = mistakeCosts[0];
      recs.push(
        `Seu erro mais caro e "${worst.name}" com custo total de $${worst.totalPnl.toFixed(2)} em ${worst.count} ocorrencia(s).`
      );
    }

    // Setup quality insight
    const bestSetup = setupOutcome.sort((a, b) => b.avgPnl - a.avgPnl)[0];
    if (bestSetup && setupOutcome.length > 1) {
      recs.push(
        `Setups "${bestSetup.name}" tem o melhor P&L medio ($${bestSetup.avgPnl.toFixed(2)}). Foque em qualidade de setup.`
      );
    }

    return recs;
  }, [avgPnlByEmotion, tiltSequences, mistakeCosts, setupOutcome]);

  const hasPsychData = trades.some((t) => t.emotion || t.discipline || t.setup_quality || typeof t.entry_rating === "number");

  if (!hasPsychData) {
    return (
      <div
        className="rounded-[22px] p-10 text-center isolate"
        style={cardStyle}
      >
        <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Psicologia de Trading</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Nenhum trade possui dados psicológicos. Para ativar esta análise, clique em qualquer trade na aba &quot;Trades&quot; e preencha os campos de emoção, disciplina e ratings.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
          <div className="rounded-xl p-4" style={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}>
            <p className="text-xs font-semibold mb-1">1. Emoção</p>
            <p className="text-[11px] text-muted-foreground">Como você se sentiu durante o trade? Calmo, ansioso, eufórico...</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}>
            <p className="text-xs font-semibold mb-1">2. Disciplina</p>
            <p className="text-[11px] text-muted-foreground">Seguiu o plano? Moveu stop? Entrou impulsivamente?</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}>
            <p className="text-xs font-semibold mb-1">3. Ratings</p>
            <p className="text-[11px] text-muted-foreground">Avalie de -1 a +1 sua entrada, saída e gestão do trade.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          Com pelo menos 10 trades anotados, você verá: distribuição emocional, detector de tilt, matriz de performance, e recomendações personalizadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Emotion Distribution (Donut) ── */}
      {emotionDistribution.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-1">Distribuição Emocional</h3>
            <p className="text-xs text-muted-foreground mb-3">Frequência de cada estado emocional nos seus trades</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={emotionDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {emotionDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* ── 2. Impact on P&L ── */}
          <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-1">Impacto Emocional no P&L</h3>
            <p className="text-xs text-muted-foreground mb-3">P&L medio por estado emocional</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={avgPnlByEmotion} layout="vertical" margin={{ left: 100, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number | string | Array<number | string>) => [`$${typeof v === "number" ? v.toFixed(2) : v}`, "P&L Medio"]}
                />
                <Bar dataKey="avgPnl" radius={[0, 4, 4, 0]}>
                  {avgPnlByEmotion.map((entry, i) => (
                    <Cell key={i} fill={entry.avgPnl >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── 3. Discipline Score Over Time ── */}
      {disciplineOverTime.length > 0 && (
        <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
          <h3 className="text-sm font-semibold mb-1">Score de Disciplina ao Longo do Tempo</h3>
          <p className="text-xs text-muted-foreground mb-3">Média móvel do score de disciplina (+1 = perfeito, -1 = indisciplinado)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={disciplineOverTime} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="index" tick={{ fontSize: 10 }} label={{ value: "Trade #", position: "bottom", fontSize: 10, offset: 0 }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => v.toFixed(1)} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: number | string | Array<number | string>) => [typeof v === "number" ? v.toFixed(2) : String(v ?? "—"), "Score"]}
                labelFormatter={(idx: number) => {
                  const pt = disciplineOverTime.find((p) => p.index === idx);
                  return pt ? pt.date : `Trade ${idx}`;
                }}
              />
              <Line type="monotone" dataKey="rolling" stroke="#3b82f6" strokeWidth={2} dot={false} name="Media Movel" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 4. Tilt Detector ── */}
      {tiltSequences.length > 0 && (
        <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark border border-red-500/20" style={cardStyle}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-500 mb-1">
            <AlertTriangle className="w-4 h-4" />
            Detector de Tilt
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Periodos com 3+ losses consecutivos acompanhados de emocoes negativas
          </p>
          <div className="space-y-2">
            {tiltSequences.map((seq, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
              >
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Tilt #{i + 1}: {seq.trades.length} trades consecutivos
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {seq.trades[0].closed_at.slice(0, 10)} a {seq.trades[seq.trades.length - 1].closed_at.slice(0, 10)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-500">
                  ${seq.totalLoss.toFixed(2)}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              <TrendingDown className="w-3 h-3 inline mr-1" />
              Prejuizo total em tilt: ${tiltSequences.reduce((s, seq) => s + seq.totalLoss, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── 5. Discipline Distribution ── */}
        {disciplineDistribution.length > 0 && (
          <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-1">Distribuição de Disciplina</h3>
            <p className="text-xs text-muted-foreground mb-3">Frequência de cada tag de disciplina</p>
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
          </div>
        )}

        {/* ── Setup Quality vs Outcome ── */}
        {setupOutcome.length > 0 && (
          <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-1">Setup Quality vs Resultado</h3>
            <p className="text-xs text-muted-foreground mb-3">Wins e losses por nivel de qualidade do setup</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={setupOutcome}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="wins" name="Wins" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── 5. Performance Matrix: Emotion x Discipline ── */}
      {performanceMatrix.length > 0 && (
        <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
          <h3 className="text-sm font-semibold mb-1">Matriz de Performance</h3>
          <p className="text-xs text-muted-foreground mb-3">P&L médio para cada combinação de emoção x disciplina (min. 2 trades)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Emocao</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-muted-foreground">Disciplina</th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">Trades</th>
                  <th className="py-2 pl-4 text-right text-xs font-medium text-muted-foreground">P&L Medio</th>
                </tr>
              </thead>
              <tbody>
                {performanceMatrix.slice(0, 15).map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-4 text-xs font-medium">{row.emotion}</td>
                    <td className="py-2 px-4 text-xs">{row.discipline}</td>
                    <td className="py-2 px-4 text-right text-xs text-muted-foreground">{row.count}</td>
                    <td className={`py-2 pl-4 text-right text-xs font-medium ${row.avgPnl >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                      {row.avgPnl >= 0 ? "+" : ""}${row.avgPnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. Ratings Over Time ── */}
      {ratingsOverTime.length > 0 && (
        <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
          <h3 className="text-sm font-semibold mb-1">Ratings ao Longo do Tempo</h3>
          <p className="text-xs text-muted-foreground mb-3">Média móvel de entry, exit e management ratings (+1 bom, -1 ruim)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ratingsOverTime} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="index" tick={{ fontSize: 10 }} label={{ value: "Trade #", position: "bottom", fontSize: 10, offset: 0 }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => v.toFixed(1)} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: number | string | Array<number | string>, name: string) => [typeof v === "number" ? v.toFixed(2) : String(v ?? "—"), name]}
                labelFormatter={(idx: number) => {
                  const pt = ratingsOverTime.find((p) => p.index === idx);
                  return pt ? pt.date : `Trade ${idx}`;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="entry" stroke="#3b82f6" strokeWidth={2} dot={false} name="Entrada" connectNulls />
              <Line type="monotone" dataKey="exit" stroke="#22c55e" strokeWidth={2} dot={false} name="Saida" connectNulls />
              <Line type="monotone" dataKey="management" stroke="#f59e0b" strokeWidth={2} dot={false} name="Gestao" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Mistake Cost Table ── */}
      {mistakeCosts.length > 0 && (
        <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
          <h3 className="text-sm font-semibold mb-1">Custo dos Erros</h3>
          <p className="text-xs text-muted-foreground mb-3">Impacto financeiro de cada tipo de erro de disciplina</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">Erro</th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">Ocorrencias</th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground">P&L Total</th>
                  <th className="py-2 pl-4 text-right text-xs font-medium text-muted-foreground">P&L Medio</th>
                </tr>
              </thead>
              <tbody>
                {mistakeCosts.map((m) => (
                  <tr key={m.name} className="border-b border-border/30">
                    <td className="py-2 pr-4 text-xs font-medium">{m.name}</td>
                    <td className="py-2 px-4 text-right text-xs text-muted-foreground">{m.count}</td>
                    <td className={`py-2 px-4 text-right text-xs font-medium ${m.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                      {m.totalPnl >= 0 ? "+" : ""}${m.totalPnl.toFixed(2)}
                    </td>
                    <td className={`py-2 pl-4 text-right text-xs ${m.avgPnl >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                      {m.avgPnl >= 0 ? "+" : ""}${m.avgPnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 7. Recommendations ── */}
      {recommendations.length > 0 && (
        <div className="rounded-[22px] p-5 isolate shadow-soft dark:shadow-soft-dark" style={cardStyle}>
          <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Brain className="w-4 h-4 text-blue-500" />
            Recomendacoes
          </h3>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl px-4 py-3 text-xs leading-relaxed"
                style={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
              >
                <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                <span className="text-foreground">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
