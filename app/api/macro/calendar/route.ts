// app/api/macro/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { apiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getSupabase() {
  // Use service role to bypass RLS — economic_events is public read data
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week") || getWeekStart();

  try {
    const supabase = getSupabase();

    // Direct query — no cache, to eliminate stale-empty-cache bugs
    const { data, error } = await supabase
      .from("economic_events")
      .select("*")
      .filter("week_start", "eq", weekParam)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.error("[macro/calendar] DB error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const events = data || [];

    if (events.length > 0) {
      const lastSynced = events.reduce((latest: string, e: { updated_at?: string }) =>
        e.updated_at && e.updated_at > latest ? e.updated_at : latest,
        events[0].updated_at || ""
      );
      const eventsWithActuals = events.filter((e: { actual?: string | null }) => e.actual).length;

      return NextResponse.json({
        ok: true,
        data: events,
        meta: { last_synced: lastSynced, events_with_actuals: eventsWithActuals, total: events.length, week_start: weekParam },
      }, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }

    return NextResponse.json({
      ok: true,
      data: [],
      meta: { week_start: weekParam, total: 0 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[macro/calendar]", message);
    return NextResponse.json({ ok: false, error: "Failed to fetch calendar data" }, { status: 500 });
  }
}
