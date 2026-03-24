// app/api/macro/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart } from "@/lib/macro/constants";
import { scrapeForexFactoryCalendar } from "@/lib/macro/scrapers/ff-calendar";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week") || getWeekStart();

  const supabase = getSupabase();
  let { data, error } = await supabase
    .from("economic_events")
    .select("*")
    .filter("week_start", "eq", weekParam)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  // Fallback: if no events for computed week, try latest available week
  if (!error && (!data || data.length === 0)) {
    const { data: latestWeek } = await supabase
      .from("economic_events")
      .select("week_start")
      .order("week_start", { ascending: false })
      .limit(1);

    if (latestWeek && latestWeek.length > 0 && latestWeek[0].week_start !== weekParam) {
      const fallback = await supabase
        .from("economic_events")
        .select("*")
        .filter("week_start", "eq", latestWeek[0].week_start)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (!fallback.error && fallback.data) {
        data = fallback.data;
      }
    }
  }

  if (error) {
    console.error("[macro/calendar]", error.message);
    return NextResponse.json({ ok: false, error: "Failed to fetch calendar data" }, { status: 500 });
  }

  // If we have data, compute freshness metadata
  if (data && data.length > 0) {
    const lastSynced = data.reduce((latest: string, e: { updated_at?: string }) =>
      e.updated_at && e.updated_at > latest ? e.updated_at : latest,
      data[0].updated_at || ""
    );
    const eventsWithActuals = data.filter((e: { actual?: string | null }) => e.actual).length;

    return NextResponse.json({
      ok: true,
      data,
      meta: { last_synced: lastSynced, events_with_actuals: eventsWithActuals, total: data.length },
    });
  }

  // Auto-sync: if DB is empty, try scraping from ForexFactory
  if (!data || data.length === 0) {
    try {
      const admin = getSupabaseAdmin();
      const events = await scrapeForexFactoryCalendar();

      if (events.length > 0) {
        const eventWeekStart = events[0].week_start;

        // Insert events into DB
        for (let i = 0; i < events.length; i += 50) {
          const batch = events.slice(i, i + 50);
          await admin.from("economic_events").upsert(batch, {
            onConflict: "event_uid",
            ignoreDuplicates: true,
          });
        }

        // If these events match the requested week, query them back
        if (eventWeekStart === weekParam) {
          const { data: freshData } = await supabase
            .from("economic_events")
            .select("*")
            .filter("week_start", "eq", weekParam)
            .order("date", { ascending: true })
            .order("time", { ascending: true });

          if (freshData && freshData.length > 0) {
            return NextResponse.json({ ok: true, data: freshData });
          }
        }
      }
    } catch (err) {
      console.error("[macro/calendar] Auto-sync from ForexFactory failed:", err);
    }
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
