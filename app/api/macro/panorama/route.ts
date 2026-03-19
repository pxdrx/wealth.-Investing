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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Debug: check what week_start values actually exist
  const { data: allRows, error: countErr } = await supabase
    .from("weekly_panoramas")
    .select("id, week_start, week_end")
    .limit(5);

  // Try fetching without .eq to debug - get all and filter in JS
  const { data: allData, error } = await supabase
    .from("weekly_panoramas")
    .select("*")
    .limit(5);

  const data = allData?.find((r: Record<string, unknown>) => r.week_start === weekStart) || null;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, code: error.code, hint: error.hint }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data,
    debug: {
      weekStart,
      urlPrefix: supabaseUrl.substring(0, 30),
      keyPrefix: supabaseKey.substring(0, 15),
      allRows,
      countErr: countErr?.message || null,
    },
  });
}
