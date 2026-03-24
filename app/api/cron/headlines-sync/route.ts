// app/api/cron/headlines-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { fetchFinancialJuiceHeadlines, fetchTruthSocialPosts } from "@/lib/macro/apify/headlines-fetcher";
import { getWeekStart } from "@/lib/macro/constants";
import type { MacroHeadline } from "@/lib/macro/types";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // 1. Fetch headlines from both sources in parallel
    const [fjResult, tsResult] = await Promise.allSettled([
      fetchFinancialJuiceHeadlines(),
      fetchTruthSocialPosts(),
    ]);

    const fjHeadlines = fjResult.status === "fulfilled" ? (fjResult.value ?? []) : [];
    const tsHeadlines = tsResult.status === "fulfilled" ? (tsResult.value ?? []) : [];

    if (fjResult.status === "rejected") {
      console.error("[headlines-sync] Financial Juice fetch failed:", fjResult.reason);
    }
    if (tsResult.status === "rejected") {
      console.error("[headlines-sync] Truth Social fetch failed:", tsResult.reason);
    }

    // Helper: strip DB-managed fields before upsert
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const stripDbFields = ({ id, ...rest }: MacroHeadline): Omit<MacroHeadline, "id"> => rest;

    // 2. Upsert Financial Juice headlines
    let fjCount = 0;
    const fjValid = fjHeadlines.filter((h) => h.external_id);
    if (fjValid.length > 0) {
      const rows = fjValid.map(stripDbFields);
      const { error, count } = await supabase
        .from("macro_headlines")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error("[headlines-sync] FJ upsert error:", error.message);
      } else {
        fjCount = count ?? fjValid.length;
      }
    }

    // 3. Upsert Truth Social headlines
    let tsCount = 0;
    const tsValid = tsHeadlines.filter((h) => h.external_id);
    if (tsValid.length > 0) {
      const rows = tsValid.map(stripDbFields);
      const { error, count } = await supabase
        .from("macro_headlines")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error("[headlines-sync] TS upsert error:", error.message);
      } else {
        tsCount = count ?? tsValid.length;
      }
    }

    // 4. Prune headlines older than 7 days
    const { count: pruned } = await supabase
      .from("macro_headlines")
      .delete({ count: "exact" })
      .lt("fetched_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // 5. Create adaptive alerts for breaking headlines
    const allHeadlines = [...fjValid, ...tsValid];
    const breakingHeadlines = allHeadlines.filter((h) => h.impact === "breaking");
    if (breakingHeadlines.length > 0) {
      const alerts = breakingHeadlines.map((h) => ({
        type: "breaking" as const,
        title: h.headline.slice(0, 200),
        description: `Fonte: ${h.source === "truth_social" ? "Truth Social" : "Financial Juice"}`,
        week_start: getWeekStart(),
      }));

      const { error: alertError } = await supabase
        .from("adaptive_alerts")
        .insert(alerts);

      if (alertError) {
        console.error("[headlines-sync] Alert insert error:", alertError.message);
      }
    }

    console.log(`[headlines-sync] FJ: ${fjCount}, TS: ${tsCount}, pruned: ${pruned ?? 0}, breaking: ${breakingHeadlines.length}`);

    return NextResponse.json({
      ok: true,
      financial_juice: fjCount,
      truth_social: tsCount,
      pruned: pruned ?? 0,
    });
  } catch (error) {
    console.error("[headlines-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
