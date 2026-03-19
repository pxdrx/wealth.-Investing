// components/macro/MacroWidgetBriefing.tsx
"use client";

import { useEffect, useState } from "react";
import { SentimentBar } from "./SentimentBar";
import type { WeeklyPanorama } from "@/lib/macro/types";

export function MacroWidgetBriefing() {
  const [panorama, setPanorama] = useState<WeeklyPanorama | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/macro/panorama")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setPanorama(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    );
  }

  if (!panorama) {
    return (
      <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
        <h3 className="text-sm font-semibold">Panorama Macro</h3>
        <p className="mt-2 text-xs text-muted-foreground">Análise semanal ainda não disponível.</p>
      </div>
    );
  }

  // Show first 300 chars of narrative
  const preview = panorama.narrative.slice(0, 300) + (panorama.narrative.length > 300 ? "..." : "");

  return (
    <div className="space-y-3 rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Panorama Macro</h3>
        <a href="/app/macro" className="text-xs font-medium text-primary hover:underline">
          Ver mais
        </a>
      </div>
      <SentimentBar sentiment={panorama.sentiment} />
      <p className="text-xs leading-relaxed text-muted-foreground">{preview}</p>
    </div>
  );
}
