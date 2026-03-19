// components/macro/EconomicCalendar.tsx
"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { IMPACT_COLORS } from "@/lib/macro/constants";
import { cn } from "@/lib/utils";
import type { EconomicEvent } from "@/lib/macro/types";

interface EconomicCalendarProps {
  events: EconomicEvent[];
}

type ImpactFilter = "all" | "high" | "medium" | "low";

// Flag images via flagcdn (Windows doesn't render emoji flags)
const FLAG_CODES: Record<string, string> = {
  US: "us", EU: "eu", GB: "gb", JP: "jp", BR: "br",
  CA: "ca", AU: "au", NZ: "nz", CH: "ch", MX: "mx",
  CN: "cn", DE: "de", FR: "fr", IT: "it", ES: "es",
};

function FlagIcon({ country }: { country: string }) {
  const code = FLAG_CODES[country];
  if (!code) return <span className="w-5 text-center text-[10px] text-muted-foreground">{country}</span>;
  return (
    <img
      src={`https://flagcdn.com/20x15/${code}.png`}
      alt={country}
      width={20}
      height={15}
      className="shrink-0 rounded-[2px]"
    />
  );
}

function formatTime(time: string | null) {
  if (!time) return "—";
  // Remove seconds: "12:30:00" → "12:30"
  return time.slice(0, 5);
}

function formatDayHeader(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const day = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day}`;
}

function getTodayStr() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export function EconomicCalendar({ events }: EconomicCalendarProps) {
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("all");
  const today = getTodayStr();

  const filtered = impactFilter === "all"
    ? events
    : events.filter((e) => e.impact === impactFilter);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, EconomicEvent[]> = {};
    for (const event of filtered) {
      const key = event.date;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Track which days are expanded (today expanded by default)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    // Find if today has events, otherwise expand the latest past day
    const todayHasEvents = filtered.some((e) => e.date === today);
    if (todayHasEvents) {
      init[today] = true;
    } else {
      // Expand the last day that's <= today, or the first future day
      const pastDays = grouped.filter(([d]) => d <= today);
      const futureDays = grouped.filter(([d]) => d > today);
      if (pastDays.length) init[pastDays[pastDays.length - 1][0]] = true;
      else if (futureDays.length) init[futureDays[0][0]] = true;
    }
    return init;
  });

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  // Count events by impact for badges
  const countByImpact = (dayEvents: EconomicEvent[]) => {
    const high = dayEvents.filter((e) => e.impact === "high").length;
    const medium = dayEvents.filter((e) => e.impact === "medium").length;
    const low = dayEvents.filter((e) => e.impact === "low").length;
    return { high, medium, low };
  };

  return (
    <div className="space-y-3">
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

      {/* Events grouped by day — collapsible */}
      {grouped.map(([date, dayEvents]) => {
        const isToday = date === today;
        const isExpanded = expandedDays[date] ?? false;
        const counts = countByImpact(dayEvents);

        return (
          <div
            key={date}
            className={cn(
              "overflow-hidden rounded-[16px] border transition-colors",
              isToday
                ? "border-blue-500/30 bg-blue-500/[0.03]"
                : "border-border/40"
            )}
            style={!isToday ? { backgroundColor: "hsl(var(--card))" } : undefined}
          >
            {/* Day header — clickable */}
            <button
              type="button"
              onClick={() => toggleDay(date)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
            >
              {/* Today indicator */}
              {isToday && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              )}

              <span className={cn(
                "flex-1 text-sm font-semibold",
                isToday && "text-blue-600 dark:text-blue-400"
              )}>
                {formatDayHeader(date)}
                {isToday && <span className="ml-2 text-xs font-normal text-blue-500">Hoje</span>}
              </span>

              {/* Impact badges summary */}
              <div className="flex items-center gap-1.5">
                {counts.high > 0 && (
                  <span className="flex h-5 items-center gap-1 rounded-full bg-red-500/10 px-2 text-[10px] font-medium text-red-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {counts.high}
                  </span>
                )}
                {counts.medium > 0 && (
                  <span className="flex h-5 items-center gap-1 rounded-full bg-orange-500/10 px-2 text-[10px] font-medium text-orange-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    {counts.medium}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{dayEvents.length} eventos</span>
              </div>

              <ChevronDown className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )} />
            </button>

            {/* Events list */}
            {isExpanded && (
              <div className="border-t border-border/30 px-2 pb-2">
                {dayEvents.map((event) => {
                  const colors = IMPACT_COLORS[event.impact];
                  const hasActual = event.actual !== null && event.actual !== "";

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "mt-1 flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors",
                        hasActual && "bg-blue-500/5"
                      )}
                    >
                      {/* Time */}
                      <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                        {formatTime(event.time)}
                      </span>

                      {/* Impact dot */}
                      <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />

                      {/* Flag */}
                      <FlagIcon country={event.country} />

                      {/* Title */}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {event.title}
                      </span>

                      {/* Values */}
                      <div className="hidden shrink-0 gap-4 text-xs sm:flex">
                        <div className="w-14 text-center">
                          <div className="text-[10px] text-muted-foreground">Anterior</div>
                          <div>{event.previous || "—"}</div>
                        </div>
                        <div className="w-14 text-center">
                          <div className="text-[10px] text-muted-foreground">Previsão</div>
                          <div>{event.forecast || "—"}</div>
                        </div>
                        <div className="w-14 text-center">
                          <div className="text-[10px] text-muted-foreground">Real</div>
                          <div className={hasActual ? "font-semibold text-foreground" : ""}>
                            {event.actual || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum evento encontrado para este filtro.
        </p>
      )}
    </div>
  );
}
