// app/api/cron/te-breaking/route.ts
// High-frequency cron (every 3min) that pulls only the TE homepage featured
// breaking card. Lighter than headlines-sync, so we can run it aggressively
// without contention.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { fetchTradingEconomicsBreaking } from "@/lib/macro/scrapers/te-breaking";
import { translateHeadlines } from "@/lib/macro/translate";
import { getHeadlineTier } from "@/lib/macro/headline-filter";
import { getWeekStart } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { invalidateCache } from "@/lib/cache";
import { acquireCronLock } from "@/lib/cron-lock";

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Short lock — this cron runs every 3min so we only need to block stragglers.
  if (!(await acquireCronLock("te-breaking", 90))) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  const supabase = getSupabaseAdmin();

  try {
    const headlines = (await fetchTradingEconomicsBreaking()) ?? [];
    if (headlines.length === 0) {
      return NextResponse.json({ ok: true, captured: 0 });
    }

    const valid = headlines.filter((h) => h.external_id);
    const translated = valid.length > 0 ? await translateHeadlines(valid) : [];
    if (translated.length === 0) {
      return NextResponse.json({ ok: true, captured: 0 });
    }

    const rows = translated.map((h) => ({
      source: h.source,
      headline: h.headline,
      summary: h.summary,
      author: h.author,
      url: h.url,
      impact: h.impact,
      published_at: h.published_at,
      fetched_at: h.fetched_at,
      external_id: h.external_id,
      tier: getHeadlineTier(h),
    }));

    const { error, count } = await supabase
      .from("macro_headlines")
      .upsert(rows, {
        onConflict: "source,external_id",
        ignoreDuplicates: true,
        count: "exact",
      });

    if (error) {
      console.error("[te-breaking-cron] upsert error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const inserted = count ?? 0;

    // Only fire alert + cache bust when there is actually a new breaking row.
    if (inserted > 0) {
      const alerts = translated.map((h) => ({
        type: "breaking" as const,
        title: h.headline.slice(0, 200),
        description: "Fonte: Trading Economics (Breaking)",
        week_start: getWeekStart(),
      }));

      const { error: alertError } = await supabase.from("adaptive_alerts").insert(alerts);
      if (alertError) {
        console.error("[te-breaking-cron] alert insert error:", alertError.message);
      }

      await invalidateCache("macro:headlines");
    }

    return NextResponse.json({ ok: true, captured: translated.length, inserted });
  } catch (error) {
    console.error("[te-breaking-cron] error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
