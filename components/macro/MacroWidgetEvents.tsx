// components/macro/MacroWidgetEvents.tsx
"use client";

import { useEffect, useState } from "react";
import { IMPACT_COLORS, COUNTRY_FLAGS } from "@/lib/macro/constants";
import type { EconomicEvent } from "@/lib/macro/types";

export function MacroWidgetEvents() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/macro/calendar")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          // Show only HIGH impact upcoming events
          const highEvents = (res.data as EconomicEvent[])
            .filter((e) => e.impact === "high" && !e.actual)
            .slice(0, 5);
          setEvents(highEvents);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
        <div className="h-4 w-1/3 rounded bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-3 w-full rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[22px] p-5" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Próximos Eventos</h3>
        <a href="/app/macro" className="text-xs font-medium text-primary hover:underline">
          Calendário
        </a>
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum evento de alto impacto pendente.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const colors = IMPACT_COLORS[event.impact];
            const flag = COUNTRY_FLAGS[event.country] || event.country;
            return (
              <div key={event.id} className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                <span className="text-xs">{flag}</span>
                <span className="min-w-0 flex-1 truncate text-xs">{event.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {event.time || event.date}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
