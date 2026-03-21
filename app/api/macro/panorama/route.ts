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
  const weekStart = searchParams.get("week") || getWeekStart();

  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from("weekly_panoramas")
    .select("*")
    .filter("week_start", "eq", weekStart)
    .limit(1);

  if (error) {
    console.error("[macro/panorama]", error.message);
    return NextResponse.json({ ok: false, error: "Failed to fetch panorama data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: rows?.[0] || null });
}
