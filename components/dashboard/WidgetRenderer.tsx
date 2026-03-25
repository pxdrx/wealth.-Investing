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
  news: { title: "Macro Panorama", titlePtBr: "Panorama Macro", tier: "free" },
  "equity-mini": { title: "Equity Curve", titlePtBr: "Curva de Equity", tier: "pro" },
  tiltmeter: { title: "Tiltmeter", titlePtBr: "Termômetro Emocional", tier: "pro" },
  "top-symbols": { title: "Top Symbols", titlePtBr: "Top Ativos", tier: "pro" },
  "session-heatmap": { title: "Session Heatmap", titlePtBr: "Mapa de Sessões", tier: "pro" },
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

// ─── Small widget IDs for dynamic grid sizing ──────────────────
const SMALL_WIDGET_IDS = new Set(["news", "equity-mini", "tiltmeter", "top-symbols", "session-heatmap", "streaks"]);

// ─── Renderer ───────────────────────────────────────────────────

interface WidgetRendererProps {
  layout: DashboardLayout;
  registry: Record<string, ReactNode>;
}

export function WidgetRenderer({ layout, registry }: WidgetRendererProps) {
  const visible = layout.widgets
    .filter((w) => w.visible && registry[w.id] !== undefined)
    .sort((a, b) => a.order - b.order);

  // Dynamic grid spans: small widgets fill their row evenly
  const visibleSmall = visible.filter((w) => SMALL_WIDGET_IDS.has(w.id));
  const smallCount = visibleSmall.length;
  const remainder = smallCount % 3;

  function getGridClass(widgetId: string): string {
    if (!SMALL_WIDGET_IDS.has(widgetId)) return "xl:col-span-12";
    const smallIdx = visibleSmall.findIndex((w) => w.id === widgetId);
    const isInLastIncompleteRow = remainder > 0 && smallIdx >= smallCount - remainder;
    if (isInLastIncompleteRow) {
      return remainder === 1 ? "xl:col-span-12" : "xl:col-span-6";
    }
    return "xl:col-span-4";
  }

  return (
    <>
      {visible.map((w) => {
        const label = WIDGET_LABELS[w.id];
        const tier = label?.tier ?? "free";
        const node = registry[w.id];

        const gridClass = getGridClass(w.id);

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
