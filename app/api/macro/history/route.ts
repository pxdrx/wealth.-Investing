// app/api/macro/history/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("weekly_panoramas")
    .select("week_start, week_end, is_frozen, created_at")
    .order("week_start", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
