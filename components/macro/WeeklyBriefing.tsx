// components/macro/WeeklyBriefing.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { LiveIndicator } from "./LiveIndicator";
import { cn } from "@/lib/utils";
import type { WeeklyPanorama, Sentiment } from "@/lib/macro/types";

interface WeeklyBriefingProps {
  panorama: WeeklyPanorama | null;
}

/** Subtle thin sentiment bar */
function SentimentLine({ sentiment }: { sentiment: Sentiment | null }) {
  if (!sentiment) return null;
  const { bullish_pct, neutral_pct, bearish_pct } = sentiment;

  return (
    <div className="space-y-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/40">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${bullish_pct}%` }}
        />
        <div
          className="bg-gray-400/60 transition-all"
          style={{ width: `${neutral_pct}%` }}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${bearish_pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Bullish {bullish_pct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
          Neutro {neutral_pct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          Bearish {bearish_pct}%
        </span>
      </div>
    </div>
  );
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

/** Collapsible section */
function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/20 rounded-[16px] bg-background/20 mb-3 overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-semibold text-foreground tracking-wide">{title}</span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-300",
          open && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="space-y-4 px-5 pb-5 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function WeeklyBriefing({ panorama }: WeeklyBriefingProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  const sections = splitNarrativeSections(panorama.narrative);

  return (
    <div className="w-full">
      {/* Header (Clickable Toggle) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between group outline-none"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-display font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            Relatório Macro IA
          </h3>
          {weekRange && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest">{weekRange}</span>
          )}
          {!panorama.is_frozen && <LiveIndicator />}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-medium text-muted-foreground hidden sm:block">
            Gerado em {updatedAt}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 group-hover:bg-muted/60 transition-colors">
            <span className="text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
              {isOpen ? "Ocultar" : "Ler Relatório"}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-300",
              isOpen && "rotate-180"
            )} />
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="max-w-4xl mx-auto pt-6 pb-2">
            {/* Sentiment bar */}
            <div className="mb-8 p-4 rounded-[16px] bg-background/40 border border-border/30 backdrop-blur-md">
              <SentimentLine sentiment={panorama.sentiment} />
            </div>

            {/* Narrative content (More Apple-like typography) */}
            <div className="space-y-6">
              {sections.length <= 1 ? (
                <div className="space-y-4">
                  {renderMarkdown(panorama.narrative)}
                </div>
              ) : (
                sections.map((section, i) => (
                  <CollapsibleSection
                    key={i}
                    title={section.title}
                    defaultOpen={i === 0 || i === 1}
                  >
                    {renderMarkdown(section.content)}
                  </CollapsibleSection>
                ))
              )}
            </div>

            {/* Source tags */}
            <div className="mt-8 flex items-center gap-2 border-t border-border/30 pt-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mr-2">Powered By</span>
              <span className="rounded-md bg-blue-500/10 px-2 py-1 text-[10px] font-bold tracking-wide text-blue-500">
                Claude 3.5 Sonnet
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

/** Split narrative text into titled sections by "---" separators or bold headers */
function splitNarrativeSections(narrative: string): { title: string; content: string }[] {
  const parts = narrative.split(/\n---\n/);
  if (parts.length <= 1) {
    // Try splitting by bold section headers (lines that start and end with **)
    const lines = narrative.split("\n");
    const sections: { title: string; content: string }[] = [];
    let currentTitle = "";
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
        if (currentTitle || currentContent.length > 0) {
          sections.push({
            title: currentTitle || "Resumo",
            content: currentContent.join("\n"),
          });
        }
        currentTitle = trimmed.replace(/\*\*/g, "");
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentTitle || currentContent.length > 0) {
      sections.push({
        title: currentTitle || "Resumo",
        content: currentContent.join("\n"),
      });
    }

    // If we only found one section, return empty to show flat mode
    if (sections.length <= 1) return [];
    return sections;
  }

  return parts.map((part, i) => {
    const lines = part.trim().split("\n");
    const firstLine = lines[0]?.trim() || "";
    // Check if first line is a bold header
    if (firstLine.startsWith("**") && firstLine.endsWith("**")) {
      return {
        title: firstLine.replace(/\*\*/g, ""),
        content: lines.slice(1).join("\n"),
      };
    }
    return {
      title: i === 0 ? "Resumo" : `Seção ${i + 1}`,
      content: part.trim(),
    };
  });
}
