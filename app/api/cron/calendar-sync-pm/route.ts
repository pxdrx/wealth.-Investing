// Afternoon calendar sync — focuses on TE actuals after US market opens
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { scrapeTeCalendarActuals } from "@/lib/macro/te-scraper";
import { mergeTeActuals } from "@/lib/macro/actuals-merger";
import { requireEnv } from "@/lib/env";

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

  try {
    const supabase = getSupabaseAdmin();
    const teRows = await scrapeTeCalendarActuals();

    if (teRows.length === 0) {
      return NextResponse.json({ ok: true, message: "No TE data available", teRows: 0, updated: 0 });
    }

    const result = await mergeTeActuals(teRows, supabase);
    console.log(`[calendar-sync-pm] TE actuals: ${result.updated} updated, ${result.surprises.length} surprises`);

    // Trigger narrative updates for surprises
    if (result.surprises.length > 0) {
      for (const surprise of result.surprises) {
        try {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";

          await fetch(`${baseUrl}/api/cron/narrative-update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({ event_id: surprise.eventId }),
          });
        } catch (err) {
          console.warn("[calendar-sync-pm] Failed to trigger narrative update:", err);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      teRows: teRows.length,
      updated: result.updated,
      surprises: result.surprises.length,
    });
  } catch (error) {
    console.error("[calendar-sync-pm] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export { POST as GET };
