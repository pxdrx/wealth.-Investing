// app/api/macro/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekA = searchParams.get("weekA");
  const weekB = searchParams.get("weekB");

  if (!weekA || !weekB) {
    return NextResponse.json({ ok: false, error: "Missing weekA or weekB" }, { status: 400 });
  }

  const supabase = getSupabase();
  const [panoramaA, panoramaB, eventsA, eventsB] = await Promise.all([
    supabase.from("weekly_panoramas").select("*").filter("week_start", "eq", weekA).limit(1).then(r => ({ ...r, data: r.data?.[0] || null })),
    supabase.from("weekly_panoramas").select("*").filter("week_start", "eq", weekB).limit(1).then(r => ({ ...r, data: r.data?.[0] || null })),
    supabase.from("economic_events").select("*").filter("week_start", "eq", weekA).order("date"),
    supabase.from("economic_events").select("*").filter("week_start", "eq", weekB).order("date"),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      weekA: { panorama: panoramaA.data, events: eventsA.data || [] },
      weekB: { panorama: panoramaB.data, events: eventsB.data || [] },
    },
  });
}
