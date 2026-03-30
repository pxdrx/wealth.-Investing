// components/macro/EconomicCalendar.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, ExternalLink, RefreshCw, ChevronsUpDown } from "lucide-react";
import { IMPACT_COLORS } from "@/lib/macro/constants";
import { cn } from "@/lib/utils";
import type { EconomicEvent } from "@/lib/macro/types";

interface EconomicCalendarProps {
  events: EconomicEvent[];
  weekStart: string;
  onWeekChange: (week: string) => void;
  onRefresh?: () => Promise<void>;
}

type ImpactFilter = "all" | "high" | "medium" | "low";

// --- Timezone support ---
const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "BRT", long: "Brasília" },
  { value: "America/New_York", label: "ET", long: "Nova York" },
  { value: "Europe/London", label: "GMT", long: "Londres" },
  { value: "Asia/Tokyo", label: "JST", long: "Tóquio" },
  { value: "UTC", label: "UTC", long: "UTC" },
] as const;

const TZ_STORAGE_KEY = "economic-calendar-tz";

function getStoredTimezone(): string {
  if (typeof window === "undefined") return "America/Sao_Paulo";
  return localStorage.getItem(TZ_STORAGE_KEY) || "America/Sao_Paulo";
}

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

/** Convert an event's date+time to display in the selected timezone */
function formatTimeInTz(date: string, time: string | null, tz: string): string {
  if (!time) return "—";
  try {
    const timePart = time.length === 5 ? `${time}:00` : time;
    const utcDate = new Date(`${date}T${timePart}Z`);
    if (isNaN(utcDate.getTime())) return time.slice(0, 5);
    return utcDate.toLocaleTimeString("pt-BR", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return time.slice(0, 5);
  }
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

/** Format week label: "Semana de 17 mar." */
function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00");
  const day = d.getDate();
  const month = d.toLocaleDateString("pt-BR", { month: "short" });
  return `Semana de ${day} ${month}`;
}

/** Shift a week_start string by N weeks */
function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

/** Get Monday of the current week */
function getCurrentWeekMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/** Build a comparable datetime string for an event (UTC) */
function eventDateTime(event: EconomicEvent): string {
  const time = event.time ?? "23:59";
  return `${event.date}T${time.length === 5 ? time + ":00" : time}Z`;
}

/** Find the IDs of the last occurred event and next upcoming event */
function findHighlightedEvents(events: EconomicEvent[]): {
  lastOccurredId: string | null;
  nextUpcomingId: string | null;
} {
  const now = new Date();
  let lastOccurredId: string | null = null;
  let lastOccurredDt = "";
  let nextUpcomingId: string | null = null;
  let nextUpcomingDt = "";

  for (const event of events) {
    const dt = eventDateTime(event);
    const hasActual = event.actual !== null && event.actual !== "";
    const eventDate = new Date(dt);

    if (hasActual && eventDate <= now) {
      if (!lastOccurredDt || dt > lastOccurredDt) {
        lastOccurredDt = dt;
        lastOccurredId = event.id;
      }
    }

    if (!hasActual && eventDate > now) {
      if (!nextUpcomingDt || dt < nextUpcomingDt) {
        nextUpcomingDt = dt;
        nextUpcomingId = event.id;
      }
    }
  }

  return { lastOccurredId, nextUpcomingId };
}

/** Detect speech/testimony events that have no numeric data */
function isSpeechEvent(title: string): boolean {
  const lower = title.toLowerCase();
  return lower.includes("speaks") || lower.includes("speech") || lower.includes("testimony") || lower.includes("conference") || lower.includes("hearing");
}


export function EconomicCalendar({ events, weekStart, onWeekChange, onRefresh }: EconomicCalendarProps) {
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("all");
  const [timezone, setTimezone] = useState<string>("America/Sao_Paulo");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const today = getTodayStr();
  const currentWeekMonday = getCurrentWeekMonday();

  // Week navigation limits: 4 weeks back, 1 week forward
  const minWeek = shiftWeek(currentWeekMonday, -4);
  const maxWeek = shiftWeek(currentWeekMonday, 1);
  const canGoPrev = weekStart > minWeek;
  const canGoNext = weekStart < maxWeek;
  const isCurrentWeek = weekStart === currentWeekMonday;

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Hydrate timezone from localStorage after mount
  useEffect(() => {
    setTimezone(getStoredTimezone());
  }, []);

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem(TZ_STORAGE_KEY, tz);
  };

  const filtered = impactFilter === "all"
    ? events
    : events.filter((e) => e.impact === impactFilter);

  // Find highlighted events (based on ALL events, not just filtered)
  const { nextUpcomingId } = useMemo(
    () => findHighlightedEvents(events),
    [events]
  );

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

  // Track which days are expanded
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const lastWeekStartRef = useRef<string>("");

  // Auto-expand: only today (or nearest future day). Reset on week change.
  useEffect(() => {
    if (grouped.length === 0) return;
    if (lastWeekStartRef.current === weekStart) return;
    lastWeekStartRef.current = weekStart;

    const init: Record<string, boolean> = {};
    const todayHasEvents = grouped.some(([d]) => d === today);
    if (todayHasEvents) {
      init[today] = true;
    } else {
      // Expand the first future day, or the last day if all are past
      const futureDays = grouped.filter(([d]) => d > today);
      if (futureDays.length) {
        init[futureDays[0][0]] = true;
      } else {
        init[grouped[grouped.length - 1][0]] = true;
      }
    }
    setExpandedDays(init);
  }, [grouped, today, weekStart]);

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  // Expand/collapse all toggle
  const allExpanded = grouped.length > 0 && grouped.every(([d]) => expandedDays[d]);
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedDays({});
    } else {
      const all: Record<string, boolean> = {};
      for (const [d] of grouped) all[d] = true;
      setExpandedDays(all);
    }
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
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => canGoPrev && onWeekChange(shiftWeek(weekStart, -1))}
            disabled={!canGoPrev}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            title="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => !isCurrentWeek && onWeekChange(currentWeekMonday)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              isCurrentWeek
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {formatWeekLabel(weekStart)}
          </button>
          <button
            type="button"
            onClick={() => canGoNext && onWeekChange(shiftWeek(weekStart, 1))}
            disabled={!canGoNext}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            title="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => onWeekChange(currentWeekMonday)}
              className="ml-1 rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Top bar: Impact filter + Timezone selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {/* Timezone selector + expand/collapse + refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="rounded-full border border-border/50 bg-transparent px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:border-border focus:border-primary"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} — {tz.long}
                </option>
              ))}
            </select>
          </div>

          {grouped.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1 rounded-full border border-border/50 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              title={allExpanded ? "Recolher todos" : "Expandir todos"}
            >
              <ChevronsUpDown className="h-3 w-3" />
              {allExpanded ? "Recolher" : "Expandir"}
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-50"
              title="Atualizar calendário"
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
          )}
        </div>
      </div>

      {/* Legend for event highlighting */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500/60" />
          Próximo evento
        </span>
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
              "overflow-hidden rounded-[22px] border transition-colors",
              isToday
                ? "border-blue-500/40 bg-blue-500/5 shadow-[0_4px_24px_rgba(59,130,246,0.1)] backdrop-blur-md"
                : "border-border/30 bg-background/30 backdrop-blur-md"
            )}
          >
            {/* Day header — clickable */}
            <button
              type="button"
              onClick={() => toggleDay(date)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50"
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
                  const isNextUpcoming = event.id === nextUpcomingId;

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "mt-1 flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors",
                        isNextUpcoming && "bg-blue-500/[0.08] ring-1 ring-blue-500/20",
                      )}
                    >
                      {/* Time (converted to selected timezone) */}
                      <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                        {formatTimeInTz(event.date, event.time, timezone)}
                      </span>

                      {/* Impact dot */}
                      <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />

                      {/* Flag */}
                      <FlagIcon country={event.country} />

                      {/* Title — links to Trading Economics */}
                      <a
                        href="https://tradingeconomics.com/calendar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm group inline-flex items-center gap-1 hover:underline",
                          isNextUpcoming && "font-medium text-blue-700 dark:text-blue-400",
                        )}
                      >
                        {event.title}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </a>

                      {/* Values — hidden for speech/testimony events */}
                      {!isSpeechEvent(event.title) ? (
                        <div className="hidden shrink-0 gap-4 text-xs sm:flex">
                          <div className="w-14 text-center">
                            <div className="text-[10px] text-muted-foreground">Anterior</div>
                            <div>{event.previous || "—"}</div>
                          </div>
                          <div className="w-14 text-center">
                            <div className="text-[10px] text-muted-foreground">Previsão</div>
                            <div>{event.forecast || "—"}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="hidden sm:block text-[10px] text-muted-foreground italic">
                          Discurso
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {events.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Sem dados para esta semana
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Clique em Atualizar para sincronizar o calendário.
            </p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="mt-1 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isRefreshing ? "Sincronizando..." : "Sincronizar agora"}
            </button>
          )}
        </div>
      )}

      {events.length > 0 && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum evento encontrado para este filtro.
        </p>
      )}
    </div>
  );
}
