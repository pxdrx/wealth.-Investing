// app/api/cron/rates-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { fetchCentralBankRates } from "@/lib/macro/rates-fetcher";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const rates = await fetchCentralBankRates();

    let upserted = 0;
    for (const rate of rates) {
      const { error } = await supabase
        .from("central_bank_rates")
        .upsert(rate, { onConflict: "bank_code" });
      if (!error) upserted++;
    }

    return NextResponse.json({ ok: true, upserted, total: rates.length });
  } catch (error) {
    console.error("[rates-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
