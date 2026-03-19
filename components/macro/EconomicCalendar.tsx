// components/macro/EconomicCalendar.tsx
"use client";

import { useState } from "react";
import { IMPACT_COLORS, COUNTRY_FLAGS } from "@/lib/macro/constants";
import type { EconomicEvent } from "@/lib/macro/types";

interface EconomicCalendarProps {
  events: EconomicEvent[];
}

type ImpactFilter = "all" | "high" | "medium" | "low";

export function EconomicCalendar({ events }: EconomicCalendarProps) {
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("all");

  const filtered = impactFilter === "all"
    ? events
    : events.filter((e) => e.impact === impactFilter);

  // Group by date
  const grouped = filtered.reduce<Record<string, EconomicEvent[]>>((acc, event) => {
    const key = event.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-4">
      {/* Impact filter */}
      <div className="flex gap-2">
        {(["all", "high", "medium", "low"] as ImpactFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setImpactFilter(filter)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              impactFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filter === "all" ? "Todos" : filter === "high" ? "Alto" : filter === "medium" ? "Médio" : "Baixo"}
          </button>
        ))}
      </div>

      {/* Events by day */}
      {Object.entries(grouped).map(([date, dayEvents]) => (
        <div key={date}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {formatDate(date)}
          </h4>
          <div className="space-y-1">
            {dayEvents.map((event) => {
              const colors = IMPACT_COLORS[event.impact];
              const flag = COUNTRY_FLAGS[event.country] || event.country;
              const hasActual = event.actual !== null && event.actual !== "";

              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 rounded-[12px] px-3 py-2 transition-colors ${
                    hasActual ? "bg-blue-500/5" : ""
                  }`}
                  style={{ backgroundColor: hasActual ? undefined : "hsl(var(--card))" }}
                >
                  {/* Time */}
                  <span className="w-12 shrink-0 text-xs text-muted-foreground">
                    {event.time || "—"}
                  </span>

                  {/* Impact dot */}
                  <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />

                  {/* Flag + Title */}
                  <span className="text-sm">{flag}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {event.title}
                  </span>

                  {/* Values */}
                  <div className="flex shrink-0 gap-4 text-xs">
                    <div className="text-center">
                      <div className="text-muted-foreground">Prev</div>
                      <div>{event.previous || "—"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Forecast</div>
                      <div>{event.forecast || "—"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Actual</div>
                      <div className={hasActual ? "font-semibold text-foreground" : ""}>
                        {event.actual || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum evento encontrado para este filtro.
        </p>
      )}
    </div>
  );
}
