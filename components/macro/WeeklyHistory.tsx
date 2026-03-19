// components/macro/WeeklyHistory.tsx
"use client";

import { useState, useEffect } from "react";
import { SentimentBar } from "./SentimentBar";
import type { WeeklyPanorama, EconomicEvent } from "@/lib/macro/types";

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

  if (weeks.length < 2) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Histórico disponível após a segunda semana.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Comparar com:</span>
        <div className="flex gap-2 overflow-x-auto">
          {weeks
            .filter((w) => w.week_start !== currentWeek)
            .slice(0, 8)
            .map((week) => (
              <button
                key={week.week_start}
                onClick={() =>
                  setCompareWeek(compareWeek === week.week_start ? null : week.week_start)
                }
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  compareWeek === week.week_start
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {formatWeek(week.week_start)}
              </button>
            ))}
        </div>
      </div>

      {/* Comparison view */}
      {loading && <p className="text-sm text-muted-foreground">Carregando comparação...</p>}

      {compareData && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Current week */}
          <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
            <h4 className="mb-3 text-sm font-semibold">
              Semana atual ({formatWeek(currentWeek)})
            </h4>
            <SentimentBar sentiment={compareData.weekA.panorama?.sentiment || null} />
            <p className="mt-3 text-xs text-muted-foreground">
              {compareData.weekA.events.length} eventos |{" "}
              {compareData.weekA.events.filter((e) => e.impact === "high").length} alto impacto
            </p>
          </div>

          {/* Compare week */}
          <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
            <h4 className="mb-3 text-sm font-semibold">
              Semana {formatWeek(compareWeek!)}
            </h4>
            <SentimentBar sentiment={compareData.weekB.panorama?.sentiment || null} />
            <p className="mt-3 text-xs text-muted-foreground">
              {compareData.weekB.events.length} eventos |{" "}
              {compareData.weekB.events.filter((e) => e.impact === "high").length} alto impacto
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
