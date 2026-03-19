// app/api/cron/calendar-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchFaireconomyCalendar } from "@/lib/macro/faireconomy";
import { verifyCronAuth } from "@/lib/macro/cron-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await fetchFaireconomyCalendar();

    // Upsert events (dedup by event_uid)
    let upserted = 0;
    let updated = 0;

    for (const event of events) {
      const { data: existing } = await supabaseAdmin
        .from("economic_events")
        .select("id, actual")
        .eq("event_uid", event.event_uid)
        .maybeSingle();

      if (existing) {
        // Check if actual value changed (for adaptive alerts)
        if (event.actual && event.actual !== existing.actual) {
          await supabaseAdmin
            .from("economic_events")
            .update({ actual: event.actual, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          updated++;

          // If HIGH impact and actual diverges from forecast, trigger narrative update
          if (event.impact === "high" && event.forecast && event.actual !== event.forecast) {
            await triggerNarrativeUpdate(existing.id, event);
          }
        }
      } else {
        const { error } = await supabaseAdmin.from("economic_events").insert(event);
        if (!error) upserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: events.length,
      upserted,
      updated,
    });
  } catch (error) {
    console.error("[calendar-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron (which sends GET requests)
export { POST as GET };

async function triggerNarrativeUpdate(eventId: string, event: Record<string, unknown>) {
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
      body: JSON.stringify({ event_id: eventId }),
    });
  } catch (error) {
    console.warn("[calendar-sync] Failed to trigger narrative update:", error);
  }
}
