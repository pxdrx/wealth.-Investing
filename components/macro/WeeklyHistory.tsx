// components/macro/WeeklyHistory.tsx
"use client";

import { useState, useEffect } from "react";
import { Calendar, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { SentimentBar } from "./SentimentBar";
import type { WeeklyPanorama, EconomicEvent, Sentiment } from "@/lib/macro/types";

function getDominantSentiment(sentiment: Sentiment | null): "bullish" | "bearish" | "neutral" {
  if (!sentiment) return "neutral";
  const { bullish_pct, bearish_pct, neutral_pct } = sentiment;
  if (bullish_pct >= bearish_pct && bullish_pct >= neutral_pct) return "bullish";
  if (bearish_pct >= bullish_pct && bearish_pct >= neutral_pct) return "bearish";
  return "neutral";
}

interface WeeklyHistoryProps {
  weeks: { week_start: string; week_end: string }[];
  currentWeek: string;
}

interface CompareData {
  weekA: { panorama: WeeklyPanorama | null; events: EconomicEvent[] };
  weekB: { panorama: WeeklyPanorama | null; events: EconomicEvent[] };
}

export function WeeklyHistory({ weeks, currentWeek }: WeeklyHistoryProps) {
  const [compareWeek, setCompareWeek] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!compareWeek) {
      setCompareData(null);
      return;
    }

    setLoading(true);
    fetch(`/api/macro/compare?weekA=${currentWeek}&weekB=${compareWeek}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setCompareData(json.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [compareWeek, currentWeek]);

  const formatWeek = (weekStart: string) => {
    const d = new Date(weekStart + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const formatWeekFull = (weekStart: string) => {
    const d = new Date(weekStart + "T12:00:00");
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (weeks.length < 2) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-[22px] py-8"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <Calendar className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Histórico disponível após a segunda semana.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          Comparar com:
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weeks
            .filter((w) => w.week_start !== currentWeek)
            .slice(0, 8)
            .map((week) => {
              const isActive = compareWeek === week.week_start;
              return (
                <button
                  key={week.week_start}
                  onClick={() =>
                    setCompareWeek(isActive ? null : week.week_start)
                  }
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {formatWeek(week.week_start)}
                </button>
              );
            })}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-[22px] p-5"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div className="h-4 w-1/3 rounded bg-muted mb-4" />
              <div className="h-3 w-full rounded bg-muted mb-2" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Comparison view */}
      {compareData && !loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Current week */}
          <WeekCard
            title="Semana atual"
            subtitle={formatWeekFull(currentWeek)}
            panorama={compareData.weekA.panorama}
            events={compareData.weekA.events}
            isCurrent
          />

          {/* Compare week */}
          <WeekCard
            title="Semana anterior"
            subtitle={formatWeekFull(compareWeek!)}
            panorama={compareData.weekB.panorama}
            events={compareData.weekB.events}
          />
        </div>
      )}

      {/* No selection hint */}
      {!compareWeek && !loading && (
        <div
          className="flex items-center gap-3 rounded-[22px] px-5 py-4"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <Activity className="h-5 w-5 text-muted-foreground/50 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Selecione uma semana acima para comparar o sentimento de mercado e
            eventos econômicos.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Week comparison card ────────────────────────────────────── */

interface WeekCardProps {
  title: string;
  subtitle: string;
  panorama: WeeklyPanorama | null;
  events: EconomicEvent[];
  isCurrent?: boolean;
}

function WeekCard({ title, subtitle, panorama, events, isCurrent }: WeekCardProps) {
  const totalEvents = events.length;
  const highImpact = events.filter((e) => e.impact === "high").length;
  const sentiment = panorama?.sentiment || null;
  const dominant = getDominantSentiment(sentiment);

  const sentimentLabel =
    dominant === "bullish"
      ? "Otimista"
      : dominant === "bearish"
        ? "Pessimista"
        : "Neutro";

  const sentimentColor =
    dominant === "bullish"
      ? "text-emerald-500"
      : dominant === "bearish"
        ? "text-red-500"
        : "text-gray-400";

  const SentimentIcon =
    dominant === "bullish"
      ? TrendingUp
      : dominant === "bearish"
        ? TrendingDown
        : Activity;

  return (
    <div
      className={`rounded-[22px] p-5 border transition-colors ${
        isCurrent ? "border-primary/20" : "border-transparent"
      }`}
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold">{title}</h4>
          {isCurrent && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Atual
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>

      {/* Sentiment */}
      <div className="mb-4">
        <SentimentBar sentiment={sentiment} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[12px] bg-muted/40 px-3 py-2 text-center">
          <div className={`text-sm font-semibold ${sentimentColor}`}>
            <SentimentIcon className="h-4 w-4 mx-auto mb-0.5" />
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {sentimentLabel}
          </div>
        </div>
        <div className="rounded-[12px] bg-muted/40 px-3 py-2 text-center">
          <div className="text-sm font-semibold text-foreground">
            {totalEvents}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Eventos
          </div>
        </div>
        <div className="rounded-[12px] bg-muted/40 px-3 py-2 text-center">
          <div className={`text-sm font-semibold ${highImpact > 0 ? "text-amber-500" : "text-foreground"}`}>
            {highImpact}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Alto impacto
          </div>
        </div>
      </div>
    </div>
  );
}
