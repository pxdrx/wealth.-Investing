// app/api/macro/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { cached } from "@/lib/cache";
import { apiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

async function fetchCalendarData(weekParam: string) {
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
    throw new Error(error.message);
  }

  return data || [];
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week") || getWeekStart();

  let data: Awaited<ReturnType<typeof fetchCalendarData>>;
  try {
    data = await cached(
      `macro:calendar:${weekParam}`,
      () => fetchCalendarData(weekParam),
      { ttl: 300 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[macro/calendar]", message);
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
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // DB is empty — return empty array (cron job handles population)
  return NextResponse.json({ ok: true, data: data || [] }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
