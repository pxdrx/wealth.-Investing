// components/macro/MacroWidgetBriefing.tsx
"use client";

import { useEffect, useState } from "react";
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
      <div className="animate-pulse space-y-3 rounded-[22px] bg-card isolate p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    );
  }

  if (!panorama) {
    return (
      <div className="rounded-[22px] border border-border/40 bg-card shadow-sm overflow-hidden h-full flex flex-col p-5 isolate" style={{ backgroundColor: "hsl(var(--card))" }}>
        <h3 className="text-sm font-semibold">Panorama Macro</h3>
        <p className="mt-2 text-xs text-muted-foreground">Análise semanal ainda não disponível.</p>
      </div>
    );
  }

  // Show first 300 chars of narrative, stripping markdown bold markers
  const rawPreview = panorama.narrative.slice(0, 300) + (panorama.narrative.length > 300 ? "..." : "");
  const preview = rawPreview.replace(/\*\*/g, "");

  return (
    <div className="space-y-3 rounded-[22px] border border-border/40 bg-card shadow-sm overflow-hidden h-full flex flex-col p-5 isolate" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold">Panorama Macro</h3>
        <a
          href="#macro-panorama"
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(
              new CustomEvent("macro:switch-tab", {
                detail: { tab: "report", anchor: "macro-panorama" },
              }),
            );
          }}
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver mais
        </a>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground flex-1">{preview}</p>
    </div>
  );
}
