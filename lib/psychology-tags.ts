"use client";

import type { JournalTradeRow } from "@/components/journal/types";
import { getNetPnl } from "@/components/journal/types";

// ─── Emotion Tags ───────────────────────────────────────────────
export interface EmotionTag {
  key: string;
  label: string;
  labelPtBr: string;
  sentiment: -1 | 0 | 1;
  icon: string;
}

export const EMOTION_TAGS: EmotionTag[] = [
  { key: "confident", label: "Confident", labelPtBr: "Confiante", sentiment: 1, icon: "💪" },
  { key: "calm", label: "Calm", labelPtBr: "Calmo", sentiment: 1, icon: "😌" },
  { key: "focused", label: "Focused", labelPtBr: "Focado", sentiment: 1, icon: "🎯" },
  { key: "neutral", label: "Neutral", labelPtBr: "Neutro", sentiment: 0, icon: "😐" },
  { key: "anxious", label: "Anxious", labelPtBr: "Ansioso", sentiment: -1, icon: "😰" },
  { key: "fearful", label: "Fearful", labelPtBr: "Com Medo", sentiment: -1, icon: "😨" },
  { key: "fud", label: "FUD", labelPtBr: "FUD", sentiment: -1, icon: "😱" },
  { key: "fomo", label: "FOMO", labelPtBr: "FOMO", sentiment: -1, icon: "🤑" },
  { key: "revenge", label: "Revenge", labelPtBr: "Vingança", sentiment: -1, icon: "😤" },
  { key: "frustrated", label: "Frustrated", labelPtBr: "Frustrado", sentiment: -1, icon: "😣" },
  { key: "greedy", label: "Greedy", labelPtBr: "Ganancioso", sentiment: -1, icon: "🤤" },
  { key: "impatient", label: "Impatient", labelPtBr: "Impaciente", sentiment: -1, icon: "⏳" },
  { key: "bored", label: "Bored", labelPtBr: "Entediado", sentiment: -1, icon: "😴" },
  { key: "euphoric", label: "Euphoric", labelPtBr: "Eufórico", sentiment: -1, icon: "🤩" },
];

// ─── Discipline Tags ────────────────────────────────────────────
export interface DisciplineTag {
  key: string;
  label: string;
  labelPtBr: string;
  sentiment: -1 | 0 | 1;
  icon: string;
}

export const DISCIPLINE_TAGS: DisciplineTag[] = [
  { key: "followed_plan", label: "Followed Plan", labelPtBr: "Seguiu o Plano", sentiment: 1, icon: "✅" },
  { key: "perfect_execution", label: "Perfect Execution", labelPtBr: "Execução Perfeita", sentiment: 1, icon: "🏆" },
  { key: "early_entry", label: "Early Entry", labelPtBr: "Entrada Antecipada", sentiment: -1, icon: "⏩" },
  { key: "late_entry", label: "Late Entry", labelPtBr: "Entrada Atrasada", sentiment: -1, icon: "⏪" },
  { key: "early_exit", label: "Early Exit", labelPtBr: "Saída Antecipada", sentiment: -1, icon: "🚪" },
  { key: "late_exit", label: "Late Exit", labelPtBr: "Saída Atrasada", sentiment: -1, icon: "🐌" },
  { key: "moved_stop", label: "Moved Stop", labelPtBr: "Moveu o Stop", sentiment: -1, icon: "🔄" },
  { key: "no_stop", label: "No Stop Loss", labelPtBr: "Sem Stop Loss", sentiment: -1, icon: "🚫" },
  { key: "oversized", label: "Oversized", labelPtBr: "Lote Excessivo", sentiment: -1, icon: "📈" },
  { key: "undersized", label: "Undersized", labelPtBr: "Lote Pequeno", sentiment: -1, icon: "📉" },
  { key: "revenge_trade", label: "Revenge Trade", labelPtBr: "Trade Vingança", sentiment: -1, icon: "🔥" },
  { key: "fomo_trade", label: "FOMO Trade", labelPtBr: "Trade FOMO", sentiment: -1, icon: "💨" },
  { key: "overtraded", label: "Overtraded", labelPtBr: "Overtrading", sentiment: -1, icon: "♻️" },
  { key: "break_rules", label: "Break Rules", labelPtBr: "Quebrou Regras", sentiment: -1, icon: "⚠️" },
];

// ─── Setup Tags ────────────────────────────────────────────────
export const SETUP_TAGS: Record<string, { label: string; emoji: string }> = {
  breakout: { label: "Breakout", emoji: "💥" },
  pullback: { label: "Pullback", emoji: "↩️" },
  reversal: { label: "Reversão", emoji: "🔄" },
  range: { label: "Range", emoji: "📊" },
  trend_follow: { label: "Trend Following", emoji: "📈" },
  counter_trend: { label: "Contra-Tendência", emoji: "🔀" },
  news_trade: { label: "Trade de Notícia", emoji: "📰" },
  scalp: { label: "Scalp", emoji: "⚡" },
};

// ─── Mistake Tags ──────────────────────────────────────────────
export const MISTAKE_TAGS: Record<string, { label: string; emoji: string }> = {
  fomo: { label: "FOMO", emoji: "😰" },
  sl_wide: { label: "SL Largo", emoji: "📏" },
  early_exit: { label: "Saída Antecipada", emoji: "🏃" },
  late_entry: { label: "Entrada Tardia", emoji: "⏰" },
  oversize: { label: "Posição Grande", emoji: "🎰" },
  revenge_trade: { label: "Trade Vingança", emoji: "😤" },
  no_plan: { label: "Sem Plano", emoji: "❌" },
};

// ─── Setup Quality ──────────────────────────────────────────────
export interface SetupQualityOption {
  key: string;
  label: string;
  color: string;
}

export const SETUP_QUALITY: SetupQualityOption[] = [
  { key: "a_plus", label: "A+", color: "text-emerald-600 dark:text-emerald-400" },
  { key: "a", label: "A", color: "text-emerald-500 dark:text-emerald-400" },
  { key: "b", label: "B", color: "text-yellow-600 dark:text-yellow-400" },
  { key: "c", label: "C", color: "text-red-500 dark:text-red-400" },
];

// ─── Sub-Rating ─────────────────────────────────────────────────
export const SUB_RATING_OPTIONS = [
  { value: -1, label: "👎", title: "Ruim" },
  { value: 0, label: "😐", title: "OK" },
  { value: 1, label: "👍", title: "Bom" },
] as const;

// ─── Tiltmeter ──────────────────────────────────────────────────
export type TiltmeterZone = "green" | "yellow" | "red";

export interface TiltmeterResult {
  score: number;
  zone: TiltmeterZone;
  label: string;
}

/**
 * Computes a "tilt" score from the last N trades based on emotion sentiment,
 * discipline sentiment, and sub-ratings (entry/exit/management).
 *
 * Score range: -1 (full tilt) to +1 (fully composed).
 * Only non-null components are averaged for each trade.
 */
export function computeTiltmeter(
  trades: JournalTradeRow[],
  windowSize = 10
): TiltmeterResult {
  // Take last N trades sorted by closed_at desc
  const sorted = [...trades].sort(
    (a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime()
  );
  const window = sorted.slice(0, windowSize);

  if (window.length === 0) {
    return { score: 0, zone: "yellow", label: "Sem dados" };
  }

  const emotionMap = new Map(EMOTION_TAGS.map((t) => [t.key, t.sentiment]));
  const disciplineMap = new Map(DISCIPLINE_TAGS.map((t) => [t.key, t.sentiment]));

  let totalScore = 0;
  let count = 0;

  for (const trade of window) {
    const components: number[] = [];

    // Emotion sentiment
    if (trade.emotion && emotionMap.has(trade.emotion)) {
      components.push(emotionMap.get(trade.emotion)!);
    }

    // Discipline sentiment
    if (trade.discipline && disciplineMap.has(trade.discipline)) {
      components.push(disciplineMap.get(trade.discipline)!);
    }

    // Sub-ratings (already -1/0/+1)
    if (typeof trade.entry_rating === "number") components.push(trade.entry_rating);
    if (typeof trade.exit_rating === "number") components.push(trade.exit_rating);
    if (typeof trade.management_rating === "number") components.push(trade.management_rating);

    // Win/loss as a subtle signal
    const net = getNetPnl(trade);
    if (net !== 0) components.push(net > 0 ? 0.5 : -0.5);

    if (components.length > 0) {
      const avg = components.reduce((s, v) => s + v, 0) / components.length;
      totalScore += avg;
      count++;
    }
  }

  const score = count > 0 ? Math.max(-1, Math.min(1, totalScore / count)) : 0;

  let zone: TiltmeterZone;
  let label: string;

  if (score > 0.3) {
    zone = "green";
    label = "Focado";
  } else if (score < -0.3) {
    zone = "red";
    label = "Em Tilt";
  } else {
    zone = "yellow";
    label = "Neutro";
  }

  return { score: Math.round(score * 100) / 100, zone, label };
}

// ─── Helpers ────────────────────────────────────────────────────
export function getEmotionTag(key: string): EmotionTag | undefined {
  return EMOTION_TAGS.find((t) => t.key === key);
}

export function getDisciplineTag(key: string): DisciplineTag | undefined {
  return DISCIPLINE_TAGS.find((t) => t.key === key);
}

export function getSetupQuality(key: string): SetupQualityOption | undefined {
  return SETUP_QUALITY.find((t) => t.key === key);
}

/** Validate custom tags: max N tags (default 4), max 50 chars each */
export function validateCustomTags(tags: string[], max = 4): string[] {
  return tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 50)
    .slice(0, max);
}
