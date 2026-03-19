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
  const { data, error } = await supabase
    .from("weekly_panoramas")
    .select("*")
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, code: error.code, hint: error.hint }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data, debug: { weekStart, hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL, hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
}
