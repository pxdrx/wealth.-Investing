"use client";

import { ComponentType, ReactNode } from "react";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

export interface DashboardWidgetDef {
  id: string;
  title: string;
  titlePtBr: string;
  component: ComponentType<Record<string, unknown>>;
  tier: "free" | "pro" | "plus";
  defaultVisible: boolean;
  defaultOrder: number;
}

export interface DashboardLayout {
  widgets: { id: string; visible: boolean; order: number }[];
  version: number;
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  version: 1,
  widgets: [
    { id: "kpi", visible: true, order: 0 },
    { id: "accounts", visible: true, order: 1 },
    { id: "calendar", visible: true, order: 2 },
    { id: "news", visible: true, order: 3 },
    { id: "equity-mini", visible: false, order: 4 },
    { id: "tiltmeter", visible: false, order: 5 },
    { id: "top-symbols", visible: false, order: 6 },
    { id: "session-heatmap", visible: false, order: 7 },
    { id: "streaks", visible: false, order: 8 },
    { id: "ai-insight", visible: false, order: 9 },
  ],
};

// ─── Widget name lookup (PT-BR) ─────────────────────────────────

export const WIDGET_LABELS: Record<string, { title: string; titlePtBr: string; tier: "free" | "pro" | "plus" }> = {
  kpi: { title: "Performance Summary", titlePtBr: "Resumo de Performance", tier: "free" },
  accounts: { title: "Accounts Overview", titlePtBr: "Visão de Contas", tier: "pro" },
  calendar: { title: "Calendar", titlePtBr: "Calendário", tier: "free" },
  news: { title: "News", titlePtBr: "Notícias", tier: "free" },
  "equity-mini": { title: "Equity Curve", titlePtBr: "Curva de Equity", tier: "pro" },
  tiltmeter: { title: "Tiltmeter", titlePtBr: "Tiltmeter", tier: "pro" },
  "top-symbols": { title: "Top Symbols", titlePtBr: "Top Ativos", tier: "pro" },
  "session-heatmap": { title: "Session Heatmap", titlePtBr: "Heatmap de Sessões", tier: "pro" },
  streaks: { title: "Streaks", titlePtBr: "Sequências", tier: "free" },
  "ai-insight": { title: "AI Insight", titlePtBr: "Insight IA", tier: "pro" },
};

// ─── Merge user layout with defaults ────────────────────────────

export function mergeLayout(userLayout: DashboardLayout | null | undefined): DashboardLayout {
  if (!userLayout || userLayout.version !== DEFAULT_LAYOUT.version) {
    return DEFAULT_LAYOUT;
  }
  // Ensure all default widget IDs exist in the user layout
  const existing = new Set(userLayout.widgets.map((w) => w.id));
  const merged = [...userLayout.widgets];
  for (const dw of DEFAULT_LAYOUT.widgets) {
    if (!existing.has(dw.id)) {
      merged.push(dw);
    }
  }
  return { ...userLayout, widgets: merged };
}

// ─── Renderer ───────────────────────────────────────────────────

interface WidgetRendererProps {
  layout: DashboardLayout;
  registry: Record<string, ReactNode>;
}

export function WidgetRenderer({ layout, registry }: WidgetRendererProps) {
  const visible = layout.widgets
    .filter((w) => w.visible && registry[w.id] !== undefined)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {visible.map((w) => {
        const label = WIDGET_LABELS[w.id];
        const tier = label?.tier ?? "free";
        const node = registry[w.id];

        // Asymmetrical Bento Box sizing logic
        let gridClass = "xl:col-span-12";
        // "esses 3 alinhados no mesmo nivel" => news, equity-mini, tiltmeter side-by-side in 3 columns
        if (w.id === "news" || w.id === "equity-mini" || w.id === "tiltmeter") gridClass = "xl:col-span-4";
        // Other smaller widgets 3-column
        else if (w.id === "top-symbols" || w.id === "session-heatmap" || w.id === "streaks") gridClass = "xl:col-span-4";
        // ai-insight is full-width (col-span-12) so it centers its content

        if (tier === "pro") {
          return (
            <div key={w.id} className={cn("col-span-1 flex flex-col", gridClass)}>
              <PaywallGate requiredPlan="pro" blurContent>
                <div className="flex-1 flex flex-col">{node}</div>
              </PaywallGate>
            </div>
          );
        }

        return (
          <div key={w.id} className={cn("col-span-1 flex flex-col", gridClass)}>
            <div className="flex-1 flex flex-col">{node}</div>
          </div>
        );
      })}
    </>
  );
}
