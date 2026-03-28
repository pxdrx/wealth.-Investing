// app/api/macro/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const weekA = searchParams.get("weekA");
  const weekB = searchParams.get("weekB");

  if (!weekA || !weekB) {
    return NextResponse.json({ ok: false, error: "Missing weekA or weekB" }, { status: 400 });
  }

  const fetchCompare = async () => {
    const supabase = getSupabase();
    const [panoramaA, panoramaB, eventsA, eventsB] = await Promise.all([
      supabase.from("weekly_panoramas").select("*").filter("week_start", "eq", weekA).limit(1).then(r => ({ ...r, data: r.data?.[0] || null })),
      supabase.from("weekly_panoramas").select("*").filter("week_start", "eq", weekB).limit(1).then(r => ({ ...r, data: r.data?.[0] || null })),
      supabase.from("economic_events").select("*").filter("week_start", "eq", weekA).order("date"),
      supabase.from("economic_events").select("*").filter("week_start", "eq", weekB).order("date"),
    ]);

    return {
      weekA: { panorama: panoramaA.data, events: eventsA.data || [] },
      weekB: { panorama: panoramaB.data, events: eventsB.data || [] },
    };
  };

  let data: Awaited<ReturnType<typeof fetchCompare>>;
  try {
    data = await cached("macro:compare", fetchCompare, { ttl: 600 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[macro/compare]", message);
    return NextResponse.json({ ok: false, error: "Failed to fetch compare data" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data,
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
