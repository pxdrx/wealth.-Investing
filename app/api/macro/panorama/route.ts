// app/api/macro/panorama/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart } from "@/lib/macro/constants";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");

  const supabase = getSupabase();

  if (weekParam) {
    // Exact week requested
    const { data: rows, error } = await supabase
      .from("weekly_panoramas")
      .select("*")
      .filter("week_start", "eq", weekParam)
      .limit(1);

    if (error) {
      console.error("[macro/panorama]", error.message);
      return NextResponse.json({ ok: false, error: "Failed to fetch panorama data" }, { status: 500 });
    }

    // If exact match found, return it
    if (rows && rows.length > 0) {
      return NextResponse.json({ ok: true, data: rows[0] });
    }
  }

  // Fallback: return latest panorama (handles timezone mismatches)
  const { data: latest, error: latestErr } = await supabase
    .from("weekly_panoramas")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1);

  if (latestErr) {
    console.error("[macro/panorama] latest fallback", latestErr.message);
    return NextResponse.json({ ok: false, error: "Failed to fetch panorama data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: latest?.[0] || null });
}
