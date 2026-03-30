"use client";

import { ComponentType, ReactNode, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
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
  version: 4,
  widgets: [
    { id: "kpi", visible: true, order: 0 },
    { id: "accounts", visible: true, order: 1 },
    { id: "performance", visible: true, order: 2 },
    { id: "top-symbols", visible: false, order: 3 },
    { id: "session-heatmap", visible: false, order: 4 },
    { id: "streaks", visible: false, order: 5 },
    { id: "ai-insight", visible: false, order: 6 },
  ],
};

// ─── Widget name lookup (PT-BR) ─────────────────────────────────

export const WIDGET_LABELS: Record<string, { title: string; titlePtBr: string; tier: "free" | "pro" | "plus" }> = {
  kpi: { title: "Performance Summary", titlePtBr: "Resumo de Performance", tier: "free" },
  accounts: { title: "Accounts Overview", titlePtBr: "Visão de Contas", tier: "pro" },
  performance: { title: "Performance", titlePtBr: "Performance", tier: "free" },
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
const SMALL_WIDGET_IDS = new Set(["news", "top-symbols", "session-heatmap", "streaks"]);

// ─── Sortable Widget Wrapper ───────────────────────────────────

function SortableWidget({
  id,
  children,
  gridClass,
  draggable,
}: {
  id: string;
  children: ReactNode;
  gridClass: string;
  draggable: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("col-span-1 flex flex-col relative group/widget min-w-0", gridClass)}
    >
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-all opacity-0 group-hover/widget:opacity-100 cursor-grab active:cursor-grabbing"
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

// ─── Renderer ───────────────────────────────────────────────────

interface WidgetRendererProps {
  layout: DashboardLayout;
  registry: Record<string, ReactNode>;
  onReorder?: (newWidgets: DashboardLayout["widgets"]) => void;
}

export function WidgetRenderer({ layout, registry, onReorder }: WidgetRendererProps) {
  const visible = useMemo(
    () =>
      layout.widgets
        .filter((w) => w.visible && registry[w.id] !== undefined)
        .sort((a, b) => a.order - b.order),
    [layout.widgets, registry]
  );

  const visibleIds = useMemo(() => visible.map((w) => w.id), [visible]);

  // Dynamic grid spans: small widgets fill their row evenly
  const visibleSmall = useMemo(
    () => visible.filter((w) => SMALL_WIDGET_IDS.has(w.id)),
    [visible]
  );
  const smallCount = visibleSmall.length;
  const remainder = smallCount % 3;

  const getGridClass = useCallback(
    (widgetId: string): string => {
      if (!SMALL_WIDGET_IDS.has(widgetId)) return "xl:col-span-12";
      const smallIdx = visibleSmall.findIndex((w) => w.id === widgetId);
      const isInLastIncompleteRow = remainder > 0 && smallIdx >= smallCount - remainder;
      if (isInLastIncompleteRow) {
        return remainder === 1 ? "xl:col-span-12" : "xl:col-span-6";
      }
      return "xl:col-span-4";
    },
    [visibleSmall, smallCount, remainder]
  );

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorder) return;

      const oldIndex = visible.findIndex((w) => w.id === active.id);
      const newIndex = visible.findIndex((w) => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(visible, oldIndex, newIndex);

      // Build full widget list with updated orders
      const reorderedIds = new Map(reordered.map((w, i) => [w.id, i]));
      const newWidgets = layout.widgets.map((w) => {
        const newOrder = reorderedIds.get(w.id);
        return newOrder !== undefined ? { ...w, order: newOrder } : w;
      });

      onReorder(newWidgets);
    },
    [visible, layout.widgets, onReorder]
  );

  const draggable = !!onReorder;

  const content = visible.map((w) => {
    const label = WIDGET_LABELS[w.id];
    const tier = label?.tier ?? "free";
    const node = registry[w.id];
    const gridClass = getGridClass(w.id);

    const inner =
      tier === "pro" ? (
        <PaywallGate requiredPlan="pro" blurContent>
          <div className="flex-1 flex flex-col">{node}</div>
        </PaywallGate>
      ) : (
        node
      );

    return (
      <SortableWidget key={w.id} id={w.id} gridClass={gridClass} draggable={draggable}>
        {inner}
      </SortableWidget>
    );
  });

  if (!draggable) {
    return <>{content}</>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        {content}
      </SortableContext>
    </DndContext>
  );
}
