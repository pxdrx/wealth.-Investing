// app/api/macro/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart, FAIRECONOMY_URL, FAIRECONOMY_NEXT_WEEK_URL } from "@/lib/macro/constants";
import { fetchFaireconomyCalendar } from "@/lib/macro/faireconomy";

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
  const weekStart = searchParams.get("week") || getWeekStart();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("economic_events")
    .select("*")
    .filter("week_start", "eq", weekStart)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

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

  // Auto-sync: if DB is empty, try fetching from Faireconomy
  // Faireconomy "thisweek" may return current or next week depending on the day
  if (!data || data.length === 0) {
    try {
      // Try both thisweek and nextweek URLs — the fetcher auto-detects week_start from event dates
      const urls = [FAIRECONOMY_URL, FAIRECONOMY_NEXT_WEEK_URL];
      const admin = getSupabaseAdmin();
      let matchingWeekData: Record<string, unknown>[] | null = null;

      for (const url of urls) {
        try {
          // Don't pass weekStartOverride — let fetcher determine from event dates
          const events = await fetchFaireconomyCalendar(url);
          if (events.length === 0) continue;

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
          if (eventWeekStart === weekStart) {
            const { data: freshData } = await supabase
              .from("economic_events")
              .select("*")
              .filter("week_start", "eq", weekStart)
              .order("date", { ascending: true })
              .order("time", { ascending: true });
            matchingWeekData = freshData;
            break;
          }
        } catch (urlErr) {
          console.error(`[macro/calendar] Fetch from ${url} failed:`, urlErr);
        }
      }

      if (matchingWeekData && matchingWeekData.length > 0) {
        return NextResponse.json({ ok: true, data: matchingWeekData });
      }
    } catch (err) {
      console.error("[macro/calendar] Auto-sync failed:", err);
    }
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
