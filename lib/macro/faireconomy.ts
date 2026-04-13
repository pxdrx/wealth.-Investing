// lib/macro/faireconomy.ts
import { FAIRECONOMY_URL } from "./constants";
import type { FaireconomyEvent, EconomicEvent } from "./types";

function normalizeImpact(impact: string): "high" | "medium" | "low" | null {
  const lower = impact.toLowerCase();
  if (lower === "high") return "high";
  if (lower === "medium") return "medium";
  if (lower === "low") return "low";
  return null; // Skip holidays
}

/** Derive the Monday (week_start) for a given date */
function getWeekStartForDate(d: Date): string {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  const diff = copy.getUTCDate() - day + (day === 0 ? -6 : 1);
  copy.setUTCDate(diff);
  const y = copy.getUTCFullYear();
  const m = String(copy.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(copy.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDate(dateStr: string): { date: string; time: string | null; weekStart: string } {
  // Faireconomy returns dates like "2026-03-19T13:30:00-04:00" or similar ISO
  try {
    const d = new Date(dateStr);
    const date = d.toISOString().split("T")[0];
    const hours = d.getUTCHours().toString().padStart(2, "0");
    const minutes = d.getUTCMinutes().toString().padStart(2, "0");
    const time = hours === "00" && minutes === "00" ? null : `${hours}:${minutes}`;
    const weekStart = getWeekStartForDate(d);
    return { date, time, weekStart };
  } catch {
    return { date: dateStr.split("T")[0], time: null, weekStart: dateStr.split("T")[0] };
  }
}

function generateEventUid(event: FaireconomyEvent): string {
  // Dedup key: country + title + date
  const dateClean = event.date.replace(/[^0-9]/g, "").slice(0, 8);
  return `${event.country}-${dateClean}-${event.title}`.toLowerCase().replace(/\s+/g, "-").slice(0, 128);
}

export async function fetchFaireconomyCalendar(
  url: string = FAIRECONOMY_URL,
  weekStartOverride?: string
): Promise<Omit<EconomicEvent, "id" | "created_at" | "updated_at">[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "wealth-investing/1.0" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Faireconomy fetch failed: ${res.status} ${res.statusText}`);
  }

  const raw: FaireconomyEvent[] = await res.json();

  return raw
    .filter((e) => normalizeImpact(e.impact) !== null)
    .map((e) => {
      const { date, time, weekStart: derivedWeekStart } = parseDate(e.date);
      const impact = normalizeImpact(e.impact)!;
      // Use per-event week_start derived from the event's own date.
      // Override only if explicitly requested (e.g. next-week fetch).
      const weekStart = weekStartOverride || derivedWeekStart;
      return {
        event_uid: generateEventUid(e),
        date,
        time,
        country: e.country.toUpperCase().slice(0, 2),
        title: e.title,
        impact,
        forecast: e.forecast || null,
        previous: e.previous || null,
        actual: e.actual || null,
        currency: e.country.toUpperCase().slice(0, 3),
        week_start: weekStart,
      };
    });
}
