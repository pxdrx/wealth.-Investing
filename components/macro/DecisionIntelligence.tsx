// components/macro/DecisionIntelligence.tsx
"use client";

import { ArrowUp, ArrowDown, Minus, Info } from "lucide-react";
import type { DecisionIntelligence as DecisionIntelligenceType } from "@/lib/macro/types";

interface DecisionIntelligenceProps {
  data: DecisionIntelligenceType | null;
}

const DIRECTION_CONFIG = {
  long: {
    icon: ArrowUp,
    label: "Compra",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  short: {
    icon: ArrowDown,
    label: "Venda",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  neutral: {
    icon: Minus,
    label: "Neutro",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
  },
} as const;

export function DecisionIntelligence({ data }: DecisionIntelligenceProps) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Scenarios */}
      <div className="grid gap-4 md:grid-cols-2">
        {[data.base_scenario, data.alt_scenario].map((scenario, idx) => (
          <div
            key={idx}
            className="rounded-[22px] p-5"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">{scenario.title}</h4>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {scenario.probability}%
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {scenario.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {scenario.key_drivers.map((driver, i) => (
                <span
                  key={i}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {driver}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Conviction map */}
      <div className="rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
        <div className="mb-1">
          <h4 className="text-sm font-semibold">Mapa de Convicção</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Viés direcional e nível de convicção para os principais ativos, baseado na análise macroeconômica da semana.
          </p>
        </div>

        {/* Legend */}
        <div className="mt-3 mb-4 flex flex-wrap items-center gap-4 rounded-[12px] bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3" />
            <span className="font-medium">Legenda:</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <ArrowUp className="h-3 w-3 text-emerald-500" />
            <span className="text-muted-foreground">Compra (Long)</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <ArrowDown className="h-3 w-3 text-red-500" />
            <span className="text-muted-foreground">Venda (Short)</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <Minus className="h-3 w-3 text-gray-400" />
            <span className="text-muted-foreground">Neutro</span>
          </div>
        </div>

        {/* Asset grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {data.conviction_map.map((entry) => {
            const dir = entry.direction as keyof typeof DIRECTION_CONFIG;
            const config = DIRECTION_CONFIG[dir] || DIRECTION_CONFIG.neutral;
            const DirIcon = config.icon;

            return (
              <div
                key={entry.asset}
                className={`flex items-center gap-2.5 rounded-[12px] border px-3 py-2.5 transition-colors ${config.bg} ${config.border}`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                  <DirIcon className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{entry.asset}</div>
                  <div className={`text-[10px] font-medium ${config.color}`}>
                    {entry.conviction}% convicção
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
