// components/macro/WeeklyBriefing.tsx
"use client";

import { LiveIndicator } from "./LiveIndicator";
import { SentimentBar } from "./SentimentBar";
import type { WeeklyPanorama } from "@/lib/macro/types";

interface WeeklyBriefingProps {
  panorama: WeeklyPanorama | null;
}

export function WeeklyBriefing({ panorama }: WeeklyBriefingProps) {
  if (!panorama) {
    return (
      <div className="rounded-[22px] p-6" style={{ backgroundColor: "hsl(var(--card))" }}>
        <p className="text-sm text-muted-foreground">
          Narrativa semanal ainda não disponível. Será gerada automaticamente.
        </p>
      </div>
    );
  }

  const updatedAt = new Date(panorama.updated_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4 rounded-[22px] p-6" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold tracking-tight">Panorama Semanal</h3>
          {!panorama.is_frozen && <LiveIndicator />}
        </div>
        <span className="text-xs text-muted-foreground">Atualizado: {updatedAt}</span>
      </div>

      {/* Sentiment bar */}
      <SentimentBar sentiment={panorama.sentiment} />

      {/* Narrative text */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {panorama.narrative.split("\n").map((paragraph, i) => {
          if (paragraph.startsWith("---")) {
            return <hr key={i} className="my-4 border-border" />;
          }
          if (paragraph.startsWith("**")) {
            return (
              <p key={i} className="text-sm leading-relaxed">
                <strong dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*/g, "") }} />
              </p>
            );
          }
          return paragraph.trim() ? (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ) : null;
        })}
      </div>

      {/* Source tag */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500">
          Claude Sonnet
        </span>
        {panorama.te_briefing_raw && (
          <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            TradingEconomics
          </span>
        )}
        <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          ForexFactory
        </span>
      </div>
    </div>
  );
}
