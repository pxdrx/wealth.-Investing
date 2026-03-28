// app/api/macro/refresh-calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { scrapeForexFactoryCalendar } from "@/lib/macro/scrapers/ff-calendar";
import { getWeekStart, getWeekEnd, getWeekStartOffset } from "@/lib/macro/constants";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    // ForexFactory calendar page always shows current week
    // For next-week, we pass the weekStartOverride so events get tagged correctly
    const events = await scrapeForexFactoryCalendar(undefined, weekStartOverride);
    if (events.length === 0) {
      return NextResponse.json({ ok: true, fetched: 0, updated: 0 });
    }

    const weekStart = events[0].week_start;
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

    return NextResponse.json({
      ok: true,
      fetched: events.length,
      updated,
      inserted,
      teUpdated,
      icUpdated,
    });
  } catch (error) {
    console.error("[refresh-calendar] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
