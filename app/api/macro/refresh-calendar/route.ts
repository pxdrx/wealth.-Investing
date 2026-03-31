// app/api/macro/refresh-calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { scrapeForexFactoryCalendar } from "@/lib/macro/scrapers/ff-calendar";
import { fetchFaireconomyCalendar } from "@/lib/macro/faireconomy";
import { getWeekStart, getWeekEnd, getWeekStartOffset, FAIRECONOMY_URL, FAIRECONOMY_NEXT_WEEK_URL } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { invalidateCachePattern } from "@/lib/cache";

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Auth: Bearer token (user must be logged in)
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userSupabase = createSupabaseClientForUser(token);
  const { data: { user } } = await userSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");

  // Determine week_start override for next-week requests
  let weekStartOverride: string | undefined;

  if (weekParam === "next") {
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    weekStartOverride = getWeekStart(nextWeekDate);
  }

  const supabase = getSupabaseAdmin();

  try {
    // Primary: Faireconomy JSON API (reliable, no scraping)
    // Fallback: ForexFactory HTML scraper (may be blocked)
    let events: Awaited<ReturnType<typeof fetchFaireconomyCalendar>> = [];
    let source = "faireconomy";

    try {
      const feUrl = weekParam === "next" ? FAIRECONOMY_NEXT_WEEK_URL : FAIRECONOMY_URL;
      events = await fetchFaireconomyCalendar(feUrl, weekStartOverride);
      console.log(`[refresh-calendar] Faireconomy: ${events.length} events`);
    } catch (feErr) {
      console.warn("[refresh-calendar] Faireconomy failed, trying ForexFactory:", feErr);
    }

    // Fallback 1: Trading Economics scraper (reliable HTML scrape)
    if (events.length === 0) {
      try {
        const { scrapeTeCalendarActuals } = await import("@/lib/macro/te-scraper");
        const teRows = await scrapeTeCalendarActuals(weekStartOverride);
        if (teRows.length > 0) {
          const ws = weekStartOverride || getWeekStart();
          events = teRows
            .filter((r) => r.title && r.date)
            .map((r) => ({
              event_uid: `${r.country}-${r.date.replace(/[^0-9]/g, "").slice(0, 8)}-${r.title}`.toLowerCase().replace(/\s+/g, "-").slice(0, 128),
              date: r.date,
              time: r.time || null,
              country: (r.country || "XX").toUpperCase().slice(0, 2),
              title: r.title,
              impact: r.importance || "medium",
              forecast: r.forecast || null,
              previous: r.previous || null,
              actual: r.actual || null,
              currency: (r.country || "XX").toUpperCase().slice(0, 3),
              week_start: ws,
            }));
          source = "trading_economics";
          console.log(`[refresh-calendar] Trading Economics: ${events.length} events`);
        }
      } catch (teErr) {
        console.warn("[refresh-calendar] Trading Economics failed:", teErr);
      }
    }

    // Fallback 2: ForexFactory HTML scraper
    if (events.length === 0) {
      try {
        const ffEvents = await scrapeForexFactoryCalendar(undefined, weekStartOverride);
        events = ffEvents;
        source = "forexfactory";
        console.log(`[refresh-calendar] ForexFactory fallback: ${events.length} events`);
      } catch (ffErr) {
        console.warn("[refresh-calendar] ForexFactory also failed:", ffErr);
      }
    }

    if (events.length === 0) {
      console.warn("[refresh-calendar] All sources returned 0 events");
      return NextResponse.json({ ok: true, fetched: 0, updated: 0, source: "none" });
    }

    // Force week_start to current Monday (or override) — Faireconomy "thisweek" may
    // start on Sunday, giving wrong week_start if derived from first event date
    const weekStart = weekStartOverride || getWeekStart();
    console.log(`[refresh-calendar] Using week_start=${weekStart}, source=${source}, events=${events.length}`);
    // Patch all events to use the correct week_start
    for (const event of events) {
      event.week_start = weekStart;
    }
    let updated = 0;
    let inserted = 0;

    // Load existing events for this week
    const { data: existingRows } = await supabase
      .from("economic_events")
      .select("id, event_uid, actual")
      .filter("week_start", "eq", weekStart);

    const existingMap = new Map<string, { id: string; actual: string | null }>();
    for (const row of existingRows ?? []) {
      existingMap.set(row.event_uid, { id: row.id, actual: row.actual });
    }

    // Process events: update existing (especially actual values), insert new
    const toInsert: typeof events = [];
    for (const event of events) {
      const existing = existingMap.get(event.event_uid);
      if (existing) {
        // Update if actual value changed or new fields available
        if (event.actual && event.actual !== existing.actual) {
          await supabase
            .from("economic_events")
            .update({
              actual: event.actual,
              forecast: event.forecast,
              previous: event.previous,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          updated++;
        }
      } else {
        toInsert.push(event);
      }
    }

    // Batch insert new events
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error } = await supabase.from("economic_events").insert(batch);
      if (error) {
        // One-by-one fallback
        for (const event of batch) {
          const { error: singleErr } = await supabase.from("economic_events").insert(event);
          if (!singleErr) inserted++;
        }
      } else {
        inserted += batch.length;
      }
    }

    // --- TE Actuals Enrichment ---
    let teUpdated = 0;
    try {
      const { scrapeTeCalendarActuals } = await import("@/lib/macro/te-scraper");
      const { mergeTeActuals } = await import("@/lib/macro/actuals-merger");

      const teRows = await scrapeTeCalendarActuals();
      if (teRows.length > 0) {
        const mergeResult = await mergeTeActuals(teRows, supabase);
        teUpdated = mergeResult.updated;
        console.log(`[refresh-calendar] TE actuals: ${mergeResult.updated} updated`);
      }
    } catch (teErr) {
      console.warn("[refresh-calendar] TE actuals failed:", teErr);
    }

    // --- Investing.com Actuals Enrichment (Apify) ---
    let icUpdated = 0;
    try {
      const { fetchInvestingComCalendar } = await import("@/lib/macro/apify/calendar-fetcher");
      const { mergeInvestingComActuals } = await import("@/lib/macro/apify/calendar-merger");

      const currentWeekEnd = getWeekEnd();

      // Current week
      const icEvents = await fetchInvestingComCalendar(weekStart, currentWeekEnd);
      if (icEvents && icEvents.length > 0) {
        const icResult = await mergeInvestingComActuals(icEvents, supabase, weekStart);
        icUpdated += icResult.updated;
      }

      // Previous week backfill
      const prevWeekStart = getWeekStartOffset(-1);
      const prevWeekEnd = getWeekEnd(new Date(prevWeekStart + "T12:00:00Z"));
      const prevIcEvents = await fetchInvestingComCalendar(prevWeekStart, prevWeekEnd);
      if (prevIcEvents && prevIcEvents.length > 0) {
        const prevResult = await mergeInvestingComActuals(prevIcEvents, supabase, prevWeekStart);
        icUpdated += prevResult.updated;
      }

      console.log(`[refresh-calendar] Investing.com enrichment: ${icUpdated} updated`);
    } catch (icErr) {
      console.warn("[refresh-calendar] Investing.com enrichment failed:", icErr);
    }

    // Invalidate Redis cache after refresh
    await invalidateCachePattern("macro:calendar:*");

    return NextResponse.json({
      ok: true,
      fetched: events.length,
      updated,
      inserted,
      teUpdated,
      icUpdated,
      source,
    });
  } catch (error) {
    console.error("[refresh-calendar] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
