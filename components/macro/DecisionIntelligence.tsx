// components/macro/DecisionIntelligence.tsx
"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { DecisionIntelligence as DecisionIntelligenceType } from "@/lib/macro/types";

interface DecisionIntelligenceProps {
  data: DecisionIntelligenceType | null;
}

export function DecisionIntelligence({ data }: DecisionIntelligenceProps) {
  if (!data) return null;

  const DirectionIcon = ({ direction }: { direction: string }) => {
    if (direction === "long") return <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />;
    if (direction === "short") return <ArrowDown className="h-3.5 w-3.5 text-red-500" />;
    return <Minus className="h-3.5 w-3.5 text-gray-400" />;
  };

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
        <h4 className="mb-3 text-sm font-semibold">Mapa de Convicção</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {data.conviction_map.map((entry) => (
            <div
              key={entry.asset}
              className="flex items-center gap-2 rounded-[12px] bg-muted/50 px-3 py-2"
            >
              <DirectionIcon direction={entry.direction} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{entry.asset}</div>
                <div className="text-[10px] text-muted-foreground">{entry.conviction}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
