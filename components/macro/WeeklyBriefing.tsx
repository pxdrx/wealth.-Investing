// components/macro/WeeklyBriefing.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { LiveIndicator } from "./LiveIndicator";
import { AssetImpactCards } from "./AssetImpactCards";
import { cn } from "@/lib/utils";
import type { WeeklyPanorama } from "@/lib/macro/types";

interface WeeklyBriefingProps {
  panorama: WeeklyPanorama | null;
  onRegenerate?: () => Promise<void>;
  defaultExpanded?: boolean;
}

/**
 * Detect if narrative is old format (has ## headers like "Visão Geral", "EUA", "Europa", "Fechamento").
 * Old narratives were full markdown reports; new ones are concise 2-3 paragraph summaries.
 */
function isOldNarrativeFormat(text: string): boolean {
  return /^##\s+/m.test(text) || /Visão Geral|Fechamento/i.test(text);
}

/** Parse simple markdown to React nodes */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listType === "ol") {
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          {listItems.map((item, i) => (
            <li key={i}>{inlineMarkdown(item)}</li>
          ))}
        </ol>
      );
    } else {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          {listItems.map((item, i) => (
            <li key={i}>{inlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    }
    listItems = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("---")) {
      flushList();
      nodes.push(<hr key={`hr-${nodes.length}`} className="my-3 border-border/50" />);
      continue;
    }

    // Numbered list: "1. ", "2. ", etc.
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(olMatch[1]);
      continue;
    }

    // Bullet list: "- " or "* "
    const ulMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(ulMatch[1]);
      continue;
    }

    flushList();

    // Heading-like bold line (starts and ends with **)
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      nodes.push(
        <p key={`p-${nodes.length}`} className="text-base font-semibold leading-relaxed text-foreground mt-4 mb-2">
          {trimmed.replace(/\*\*/g, "")}
        </p>
      );
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={`p-${nodes.length}`} className="text-[15px] leading-[1.7] text-muted-foreground">
        {inlineMarkdown(trimmed)}
      </p>
    );
  }

  flushList();
  return nodes;
}

/** Parse inline **bold** markers */
function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function WeeklyBriefing({ panorama, onRegenerate, defaultExpanded = false }: WeeklyBriefingProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't toggle the dropdown
    if (!onRegenerate || isRegenerating) return;
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!panorama) {
    return (
      <div
        className="rounded-[22px] border border-border/40 p-6"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
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

  const weekRange = (() => {
    try {
      const start = new Date(panorama.week_start + "T12:00:00");
      const end = new Date(panorama.week_end + "T12:00:00");
      const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      return `${fmt(start)} – ${fmt(end)}`;
    } catch {
      return "";
    }
  })();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        {/* Left side — clickable to toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-1 items-center gap-3 group outline-none min-w-0"
        >
          <h3 className="text-xl font-display font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            Briefing Macroeconômico
          </h3>
          {weekRange && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest shrink-0">{weekRange}</span>
          )}
          {!panorama.is_frozen && <LiveIndicator />}
        </button>

        {/* Right side — separate buttons */}
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground hidden sm:block">
            Gerado em {updatedAt}
          </span>
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              {isRegenerating ? "Gerando..." : "Regenerar"}
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {isOpen ? "Ocultar" : "Ler Relatório"}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-300",
              isOpen && "rotate-180"
            )} />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="pt-6 pb-2">
            {/* Summary text */}
            <div className="space-y-4 mb-8">
              {isOldNarrativeFormat(panorama.narrative) ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                    Este relatório está no formato antigo.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clique em <strong className="text-foreground">Regenerar</strong> acima para gerar o novo formato com análise por ativo e resumo conciso.
                  </p>
                </div>
              ) : (
                renderMarkdown(panorama.narrative)
              )}
            </div>

            {/* Asset Impact Cards */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Impacto por Ativo
              </h3>
              <AssetImpactCards impacts={panorama.asset_impacts || null} />
            </div>

            {/* Source tags */}
            <div className="mt-8 flex items-center gap-2 border-t border-border/30 pt-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mr-2">Powered By</span>
              <span className="rounded-md bg-blue-500/10 px-2 py-1 text-[10px] font-bold tracking-wide text-blue-500">
                Claude AI
              </span>
              {panorama.te_briefing_raw && (
                <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  TradingEconomics Data
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

