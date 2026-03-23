// app/api/macro/refresh-calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { fetchFaireconomyCalendar } from "@/lib/macro/faireconomy";
import { FAIRECONOMY_URL, FAIRECONOMY_NEXT_WEEK_URL, getWeekStart } from "@/lib/macro/constants";

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

  // Determine which Faireconomy URL and week_start to use
  let faireconomyUrl = FAIRECONOMY_URL;
  let weekStartOverride: string | undefined;

  if (weekParam === "next") {
    faireconomyUrl = FAIRECONOMY_NEXT_WEEK_URL;
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    weekStartOverride = getWeekStart(nextWeekDate);
  }

  const supabase = getSupabaseAdmin();

  try {
    const events = await fetchFaireconomyCalendar(faireconomyUrl, weekStartOverride);
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

    return NextResponse.json({
      ok: true,
      fetched: events.length,
      updated,
      inserted,
      teUpdated,
    });
  } catch (error) {
    console.error("[refresh-calendar] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
