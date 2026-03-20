// app/api/cron/calendar-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchFaireconomyCalendar } from "@/lib/macro/faireconomy";
import { verifyCronAuth } from "@/lib/macro/cron-auth";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const events = await fetchFaireconomyCalendar();
    if (events.length === 0) {
      return NextResponse.json({ ok: true, fetched: 0, upserted: 0, updated: 0 });
    }

    const weekStart = events[0].week_start;
    let upserted = 0;
    let updated = 0;
    const errors: string[] = [];

    // Load existing events for this week in bulk
    const { data: existingRows } = await supabase
      .from("economic_events")
      .select("id, event_uid, actual")
      .filter("week_start", "eq", weekStart);

    const existingMap = new Map<string, { id: string; actual: string | null }>();
    for (const row of existingRows ?? []) {
      existingMap.set(row.event_uid, { id: row.id, actual: row.actual });
    }

    // Process events: update existing, insert new
    const toInsert: typeof events = [];
    for (const event of events) {
      const existing = existingMap.get(event.event_uid);
      if (existing) {
        if (event.actual && event.actual !== existing.actual) {
          await supabase
            .from("economic_events")
            .update({ actual: event.actual, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          updated++;
          if (event.impact === "high" && event.forecast && event.actual !== event.forecast) {
            await triggerNarrativeUpdate(existing.id, event);
          }
        }
      } else {
        toInsert.push(event);
      }
    }

    // Batch insert new events (50 at a time)
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { error } = await supabase.from("economic_events").insert(batch);
      if (error) {
        errors.push(`Batch ${i}: ${error.message}`);
        // Fallback: insert one by one to find the problematic rows
        for (const event of batch) {
          const { error: singleErr } = await supabase.from("economic_events").insert(event);
          if (singleErr) {
            errors.push(`Event ${event.event_uid}: ${singleErr.message}`);
          } else {
            upserted++;
          }
        }
      } else {
        upserted += batch.length;
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: events.length,
      existing: existingMap.size,
      upserted,
      updated,
      ...(errors.length > 0 ? { errors: errors.slice(0, 10) } : {}),
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
