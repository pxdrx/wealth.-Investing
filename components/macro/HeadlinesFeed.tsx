// components/macro/HeadlinesFeed.tsx
"use client";

import { useState } from "react";
import { Newspaper, RefreshCw, Megaphone, Zap, TrendingUp, Activity, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveIndicator } from "@/components/macro/LiveIndicator";
import type { MacroHeadline } from "@/lib/macro/types";

interface HeadlinesFeedProps {
  headlines: MacroHeadline[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

type SourceFilter = "all" | "forexlive" | "reuters" | "truth_social" | "trading_economics";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d`;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "forexlive") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
        <Activity className="w-2.5 h-2.5" />
        FL
      </span>
    );
  }
  if (source === "reuters") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
        <Globe className="w-2.5 h-2.5" />
        Reuters
      </span>
    );
  }
  if (source === "truth_social") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
        <Megaphone className="w-2.5 h-2.5" />
        Trump
      </span>
    );
  }
  if (source === "trading_economics") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
        <TrendingUp className="w-2.5 h-2.5" />
        TE
      </span>
    );
  }
  // Fallback
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
      <Zap className="w-2.5 h-2.5" />
      {source}
    </span>
  );
}

function BreakingDot() {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
    </span>
  );
}

const FILTER_OPTIONS: { key: SourceFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "truth_social", label: "Trump" },
  { key: "trading_economics", label: "Trading Economics" },
  { key: "reuters", label: "Reuters" },
  { key: "forexlive", label: "ForexLive" },
];

function getBorderClass(source: string, isBreaking: boolean): string {
  if (isBreaking) return "border-l-4 border-red-500 pl-3";
  switch (source) {
    case "forexlive": return "border-l-4 border-orange-500 pl-3";
    case "reuters": return "border-l-4 border-blue-500 pl-3";
    case "truth_social": return "border-l-4 border-purple-500 pl-3";
    case "trading_economics": return "border-l-4 border-emerald-500 pl-3";
    default: return "border-l-4 border-border pl-3";
  }
}

export function HeadlinesFeed({ headlines, onRefresh, refreshing }: HeadlinesFeedProps) {
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const filtered = filter === "all"
    ? headlines
    : headlines.filter((h) => h.source === filter);

  const COMPACT_LIMIT = 5;
  const displayItems = expanded ? filtered : filtered.slice(0, COMPACT_LIMIT);
  const hasMore = filtered.length > COMPACT_LIMIT;

  return (
    <div
      className="rounded-[22px] border border-border/40 shadow-sm p-6 isolate"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Newspaper className="h-5 w-5 text-blue-500" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Headlines ao Vivo
          </h2>
          <LiveIndicator />
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Atualizar headlines"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {/* Source filter pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => { setFilter(opt.key); setExpanded(false); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === opt.key
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Headlines list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhuma headline recente
        </p>
      ) : (
        <div className={expanded ? "max-h-[400px] overflow-y-auto" : ""}>
          <div className="space-y-3">
            {displayItems.map((h) => {
              const isBreaking = h.impact === "breaking";
              const borderClass = getBorderClass(h.source, isBreaking);

              return (
                <div key={h.id} className={`${borderClass} py-1.5`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <SourceBadge source={h.source} />
                    {isBreaking && <BreakingDot />}
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {timeAgo(h.published_at || h.fetched_at)}
                    </span>
                  </div>
                  <p className={`text-sm leading-snug ${isBreaking ? "font-semibold" : "font-normal"}`}>
                    {h.url ? (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {h.headline}
                      </a>
                    ) : (
                      h.headline
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expand / collapse */}
      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 text-xs font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Ver todas ({filtered.length})
        </button>
      )}
      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 text-xs font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Mostrar menos
        </button>
      )}
    </div>
  );
}
