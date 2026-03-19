// app/api/macro/rates/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("central_bank_rates")
    .select("*")
    .order("bank_code", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
