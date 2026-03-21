// app/api/macro/history/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("weekly_panoramas")
    .select("week_start, week_end, is_frozen, created_at")
    .order("week_start", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[macro/history]", error.message);
    return NextResponse.json({ ok: false, error: "Failed to fetch history data" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
