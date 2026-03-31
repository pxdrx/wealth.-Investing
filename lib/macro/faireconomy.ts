// lib/macro/faireconomy.ts
import { FAIRECONOMY_URL, getWeekStart } from "./constants";
import type { FaireconomyEvent, EconomicEvent } from "./types";

function normalizeImpact(impact: string): "high" | "medium" | "low" | null {
  const lower = impact.toLowerCase();
  if (lower === "high") return "high";
  if (lower === "medium") return "medium";
  if (lower === "low") return "low";
  return null; // Skip holidays
}

function parseDate(dateStr: string): { date: string; time: string | null } {
  // Faireconomy returns dates like "2026-03-19T13:30:00-04:00" or similar ISO
  try {
    const d = new Date(dateStr);
    const date = d.toISOString().split("T")[0];
    const hours = d.getUTCHours().toString().padStart(2, "0");
    const minutes = d.getUTCMinutes().toString().padStart(2, "0");
    const time = hours === "00" && minutes === "00" ? null : `${hours}:${minutes}`;
    return { date, time };
  } catch {
    return { date: dateStr.split("T")[0], time: null };
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

  // Always use current Monday as week_start — deriving from first event date
  // causes bugs when Faireconomy includes Sunday events (which belong to the
  // previous week by getWeekStart logic, but are part of the trading week).
  const weekStart = weekStartOverride || getWeekStart();

  return raw
    .filter((e) => normalizeImpact(e.impact) !== null)
    .map((e) => {
      const { date, time } = parseDate(e.date);
      const impact = normalizeImpact(e.impact)!;
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
