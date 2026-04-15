// lib/macro/audit/calendar-audit.ts
// Cross-reference economic_events (DB) with Faireconomy, TradingEconomics, Investing.com.

import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { fetchFaireconomyCalendar } from "@/lib/macro/faireconomy";
import { FAIRECONOMY_URL, getWeekEnd } from "@/lib/macro/constants";
import { scrapeTeCalendarActuals } from "@/lib/macro/te-scraper";
import { fetchInvestingComCalendar } from "@/lib/macro/apify/calendar-fetcher";
import type { EconomicEvent } from "@/lib/macro/types";
import { matchEvent, normalizeCountry } from "./event-matcher";
import type {
  AuditEventRow,
  AuditField,
  AuditSourceValues,
  CalendarAuditReport,
} from "./types";

function eq(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = (a ?? "").trim().toLowerCase();
  const nb = (b ?? "").trim().toLowerCase();
  return na === nb;
}

function pickRecommendation(
  db: AuditSourceValues,
  ff: AuditSourceValues | null,
  te: AuditSourceValues | null,
  ic: AuditSourceValues | null,
  field: AuditField
): "ok" | "ff_wins" | "te_wins" | "ic_wins" | "manual" {
  const dbVal = db[field];
  const values: Array<{ src: "ff" | "te" | "ic"; v: string | null }> = [];
  if (ff) values.push({ src: "ff", v: ff[field] });
  if (te) values.push({ src: "te", v: te[field] });
  if (ic) values.push({ src: "ic", v: ic[field] });

  // If 2+ external sources agree on a value that differs from DB, recommend it.
  const counts = new Map<string, { n: number; src: "ff" | "te" | "ic" }>();
  for (const { src, v } of values) {
    if (!v) continue;
    const key = v.trim().toLowerCase();
    const prev = counts.get(key);
    if (prev) counts.set(key, { n: prev.n + 1, src: prev.src });
    else counts.set(key, { n: 1, src });
  }
  type Best = { value: string; n: number; src: "ff" | "te" | "ic" };
  let best: Best | null = null;
  counts.forEach(({ n, src }, key) => {
    const current: Best = { value: key, n, src };
    if (!best || current.n > best.n) best = current;
  });
  const winner = best as Best | null;
  if (winner && winner.n >= 2 && !eq(winner.value, dbVal)) {
    return winner.src === "ff" ? "ff_wins" : winner.src === "te" ? "te_wins" : "ic_wins";
  }
  return "manual";
}

function toValues(src: {
  previous?: string | null;
  forecast?: string | null;
  actual?: string | null;
}): AuditSourceValues {
  return {
    previous: src.previous ?? null,
    forecast: src.forecast ?? null,
    actual: src.actual ?? null,
  };
}

export async function auditCalendar(weekStart: string): Promise<CalendarAuditReport> {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const weekStartDate = new Date(weekStart + "T12:00:00Z");
  const weekEnd = getWeekEnd(weekStartDate);

  const { data: dbRows } = await supabase
    .from("economic_events")
    .select("id, event_uid, date, time, country, title, impact, forecast, previous, actual")
    .eq("week_start", weekStart)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  const events = (dbRows ?? []) as Pick<
    EconomicEvent,
    "id" | "event_uid" | "date" | "time" | "country" | "title" | "impact" | "forecast" | "previous" | "actual"
  >[];

  // Parallel fetch of external sources — each swallows its own errors to keep partial data usable.
  const [ffEvents, teRows, icEvents] = await Promise.all([
    fetchFaireconomyCalendar(FAIRECONOMY_URL).catch((err: unknown) => {
      console.warn("[calendar-audit] FF fetch failed:", err);
      return [] as Awaited<ReturnType<typeof fetchFaireconomyCalendar>>;
    }),
    scrapeTeCalendarActuals(weekStart).catch((err: unknown) => {
      console.warn("[calendar-audit] TE fetch failed:", err);
      return [] as Awaited<ReturnType<typeof scrapeTeCalendarActuals>>;
    }),
    fetchInvestingComCalendar(weekStart, weekEnd).catch((err: unknown) => {
      console.warn("[calendar-audit] IC fetch failed:", err);
      return null;
    }),
  ]);

  const rows: AuditEventRow[] = events.map((db) => {
    const matchTarget = { date: db.date, country: db.country, title: db.title };

    const ffHit = ffEvents.find((f) =>
      matchEvent(matchTarget, { date: f.date, country: f.country, title: f.title })
    );
    const teHit = teRows.find((t) =>
      matchEvent(matchTarget, { date: t.date, country: t.country, title: t.title })
    );
    const icHit = (icEvents ?? []).find((i) =>
      matchEvent(matchTarget, {
        date: i.date ?? "",
        country: normalizeCountry(i.currency ?? null),
        title: i.event ?? "",
      })
    );

    const dbVals: AuditSourceValues = toValues(db);
    const ffVals: AuditSourceValues | null = ffHit ? toValues(ffHit) : null;
    const teVals: AuditSourceValues | null = teHit ? toValues(teHit) : null;
    const icVals: AuditSourceValues | null = icHit ? toValues(icHit) : null;

    const disagreements: AuditField[] = [];
    for (const field of ["previous", "forecast", "actual"] as AuditField[]) {
      const dbV = dbVals[field];
      const vals: Array<string | null> = [];
      if (ffVals) vals.push(ffVals[field]);
      if (teVals) vals.push(teVals[field]);
      if (icVals) vals.push(icVals[field]);
      const external = vals.filter((v) => v && v.trim().length > 0);
      if (external.length === 0) continue;
      if (!external.every((v) => eq(v, dbV))) disagreements.push(field);
    }

    // Recommendation takes the first disagreeing field; simple but adequate for a UI review loop.
    let recommendation: AuditEventRow["recommendation"] = "ok";
    if (disagreements.length > 0) {
      recommendation = pickRecommendation(dbVals, ffVals, teVals, icVals, disagreements[0]);
    }

    return {
      event_id: db.id,
      event_uid: db.event_uid,
      title: db.title,
      date: db.date,
      time: db.time,
      country: db.country,
      impact: db.impact,
      db: dbVals,
      ff: ffVals,
      te: teVals,
      ic: icVals,
      disagreements,
      recommendation,
    };
  });

  return {
    weekStart,
    weekEnd,
    eventCount: events.length,
    rows,
    sourcesAvailable: {
      ff: ffEvents.length > 0,
      te: teRows.length > 0,
      ic: !!icEvents && icEvents.length > 0,
    },
    generatedAt: new Date().toISOString(),
  };
}
