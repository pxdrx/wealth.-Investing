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

  // Auto-sync: if DB is empty for current or next week, fetch from Faireconomy
  if ((!data || data.length === 0)) {
    const currentWeek = getWeekStart();
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = getWeekStart(nextWeekDate);

    let faireconomyUrl: string | null = null;
    if (weekStart === currentWeek) {
      faireconomyUrl = FAIRECONOMY_URL;
    } else if (weekStart === nextWeek) {
      faireconomyUrl = FAIRECONOMY_NEXT_WEEK_URL;
    }

    if (faireconomyUrl) {
      try {
        const events = await fetchFaireconomyCalendar(faireconomyUrl, weekStart);
        if (events.length > 0) {
          const admin = getSupabaseAdmin();
          // Insert in batches, ignore conflicts
          for (let i = 0; i < events.length; i += 50) {
            const batch = events.slice(i, i + 50);
            await admin.from("economic_events").upsert(batch, { onConflict: "event_uid", ignoreDuplicates: true });
          }

          // Re-query with fresh data
          const { data: freshData } = await supabase
            .from("economic_events")
            .select("*")
            .filter("week_start", "eq", weekStart)
            .order("date", { ascending: true })
            .order("time", { ascending: true });

          return NextResponse.json({ ok: true, data: freshData || [] });
        }
      } catch (err) {
        console.error("[macro/calendar] Auto-sync failed:", err);
        // Fall through to return empty
      }
    }
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
