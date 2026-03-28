// app/api/macro/panorama/route.ts
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

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await apiRateLimit.limit(ip);
  if (!success) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");

  const fetchPanorama = async () => {
    const supabase = getSupabase();

    if (weekParam) {
      const { data: rows, error } = await supabase
        .from("weekly_panoramas")
        .select("*")
        .filter("week_start", "eq", weekParam)
        .limit(1);

      if (error) throw new Error(error.message);
      if (rows && rows.length > 0) return rows[0];
    }

    // Fallback: return latest panorama (handles timezone mismatches)
    const { data: latest, error: latestErr } = await supabase
      .from("weekly_panoramas")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(1);

    if (latestErr) throw new Error(latestErr.message);
    return latest?.[0] || null;
  };

  let data: Awaited<ReturnType<typeof fetchPanorama>>;
  try {
    data = await cached("macro:panorama", fetchPanorama, { ttl: 600 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[macro/panorama]", message);
    return NextResponse.json({ ok: false, error: "Failed to fetch panorama data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
