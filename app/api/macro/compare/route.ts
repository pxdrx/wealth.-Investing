// app/api/macro/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekA = searchParams.get("weekA");
  const weekB = searchParams.get("weekB");

  if (!weekA || !weekB) {
    return NextResponse.json({ ok: false, error: "Missing weekA or weekB" }, { status: 400 });
  }

  const [panoramaA, panoramaB, eventsA, eventsB] = await Promise.all([
    supabase.from("weekly_panoramas").select("*").eq("week_start", weekA).maybeSingle(),
    supabase.from("weekly_panoramas").select("*").eq("week_start", weekB).maybeSingle(),
    supabase.from("economic_events").select("*").eq("week_start", weekA).order("date"),
    supabase.from("economic_events").select("*").eq("week_start", weekB).order("date"),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      weekA: { panorama: panoramaA.data, events: eventsA.data || [] },
      weekB: { panorama: panoramaB.data, events: eventsB.data || [] },
    },
  });
}
