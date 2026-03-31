// app/api/cron/calendar-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeForexFactoryCalendar } from "@/lib/macro/scrapers/ff-calendar";
import { fetchFaireconomyCalendar } from "@/lib/macro/faireconomy";
import { FAIRECONOMY_URL } from "@/lib/macro/constants";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { RATE_DECISION_PATTERNS, parseRateValue } from "@/lib/macro/rates-fetcher";
import { getWeekStart, getWeekEnd, getWeekStartOffset } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { invalidateCachePattern, invalidateCache } from "@/lib/cache";

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Primary: Faireconomy JSON API. Fallback: ForexFactory HTML scraper.
    let events: Awaited<ReturnType<typeof fetchFaireconomyCalendar>> = [];
    try {
      events = await fetchFaireconomyCalendar(FAIRECONOMY_URL);
      console.log(`[calendar-sync] Faireconomy: ${events.length} events`);
    } catch (feErr) {
      console.warn("[calendar-sync] Faireconomy failed, trying ForexFactory:", feErr);
    }
    if (events.length === 0) {
      try {
        events = await scrapeForexFactoryCalendar();
        console.log(`[calendar-sync] ForexFactory fallback: ${events.length} events`);
      } catch (ffErr) {
        console.warn("[calendar-sync] ForexFactory also failed:", ffErr);
      }
    }
    if (events.length === 0) {
      return NextResponse.json({ ok: true, fetched: 0, upserted: 0, updated: 0 });
    }

    // Force week_start to current Monday — the fetcher may derive a wrong
    // week_start when Faireconomy data starts with a Sunday event.
    const weekStart = getWeekStart();
    for (const event of events) {
      event.week_start = weekStart;
    }

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
            await triggerNarrativeUpdate(existing.id, { ...event });
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
        // Fallback: try one-by-one, update week_start on duplicates
        for (const event of batch) {
          const { error: singleErr } = await supabase.from("economic_events").insert(event);
          if (singleErr) {
            if (singleErr.message.includes("duplicate key")) {
              // Update week_start for events that exist with wrong week_start
              await supabase
                .from("economic_events")
                .update({ week_start: event.week_start, date: event.date, time: event.time, forecast: event.forecast, previous: event.previous })
                .eq("event_uid", event.event_uid);
              updated++;
            } else {
              errors.push(`Event ${event.event_uid}: ${singleErr.message}`);
            }
          } else {
            upserted++;
          }
        }
      } else {
        upserted += batch.length;
      }
    }

    // --- TE Actuals Enrichment ---
    let teActualsUpdated = 0;
    try {
      const { scrapeTeCalendarActuals } = await import("@/lib/macro/te-scraper");
      const { mergeTeActuals } = await import("@/lib/macro/actuals-merger");

      const teRows = await scrapeTeCalendarActuals();
      if (teRows.length > 0) {
        const mergeResult = await mergeTeActuals(teRows, supabase);
        teActualsUpdated = mergeResult.updated;
        console.log(`[calendar-sync] TE actuals: ${mergeResult.updated} updated, ${mergeResult.surprises.length} surprises`);

        // Trigger narrative updates for significant surprises
        for (const surprise of mergeResult.surprises) {
          await triggerNarrativeUpdate(surprise.eventId, {
            title: surprise.title,
            actual: surprise.actual,
            forecast: surprise.forecast,
            impact: "high",
          });
        }
      }
    } catch (teErr) {
      console.warn("[calendar-sync] TE actuals enrichment failed:", teErr);
    }

    // --- Investing.com Actuals Enrichment (Apify) ---
    let icUpdated = 0;
    try {
      const { fetchInvestingComCalendar } = await import("@/lib/macro/apify/calendar-fetcher");
      const { mergeInvestingComActuals } = await import("@/lib/macro/apify/calendar-merger");

      const weekEnd = getWeekEnd();

      // Current week
      const icEvents = await fetchInvestingComCalendar(weekStart, weekEnd);
      if (icEvents && icEvents.length > 0) {
        const icResult = await mergeInvestingComActuals(icEvents, supabase, weekStart);
        icUpdated += icResult.updated;
      }

      // Previous week backfill
      const prevWeekStart = getWeekStartOffset(-1);
      const prevWeekEnd = getWeekEnd(new Date(prevWeekStart + "T12:00:00Z"));
      const prevIcEvents = await fetchInvestingComCalendar(prevWeekStart, prevWeekEnd);
      if (prevIcEvents && prevIcEvents.length > 0) {
        const prevResult = await mergeInvestingComActuals(prevIcEvents, supabase, prevWeekStart);
        icUpdated += prevResult.updated;
      }

      console.log(`[calendar-sync] Investing.com enrichment: ${icUpdated} updated`);
    } catch (icErr) {
      console.warn("[calendar-sync] Investing.com enrichment failed:", icErr);
    }

    // Auto-update central bank rates from HIGH impact rate decisions with actual values
    let ratesUpdated = 0;
    for (const event of events) {
      if (event.impact !== "high" || !event.actual) continue;

      // Check if this event title matches a known rate decision
      let bankCode: string | null = null;
      for (const [pattern, code] of Object.entries(RATE_DECISION_PATTERNS)) {
        if (event.title.includes(pattern) || pattern.includes(event.title)) {
          bankCode = code;
          break;
        }
      }

      if (!bankCode) continue;

      const rateValue = parseRateValue(event.actual);
      if (rateValue === null) continue;

      // Determine action by comparing with previous
      let lastAction: "hold" | "cut" | "hike" = "hold";
      let changeBps = 0;
      if (event.previous) {
        const prevRate = parseRateValue(event.previous);
        if (prevRate !== null) {
          const diff = Math.round((rateValue - prevRate) * 100);
          if (diff > 0) { lastAction = "hike"; changeBps = diff; }
          else if (diff < 0) { lastAction = "cut"; changeBps = diff; }
        }
      }

      const { error: rateErr } = await supabase
        .from("central_bank_rates")
        .update({
          current_rate: rateValue,
          last_action: lastAction,
          last_change_bps: changeBps,
          last_change_date: event.date,
          updated_at: new Date().toISOString(),
        })
        .eq("bank_code", bankCode);

      if (!rateErr) {
        ratesUpdated++;
        console.log(`[calendar-sync] Updated ${bankCode} rate to ${rateValue}%`);
      }
    }

    // Invalidate Redis cache after successful sync
    await invalidateCachePattern("macro:calendar:*");
    if (ratesUpdated > 0) {
      await invalidateCache("macro:rates");
    }

    return NextResponse.json({
      ok: true,
      fetched: events.length,
      existing: existingMap.size,
      upserted,
      updated,
      ratesUpdated,
      teActualsUpdated,
      icUpdated,
      ...(errors.length > 0 ? { errors: errors.slice(0, 10) } : {}),
    });
  } catch (error) {
    console.error("[calendar-sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
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
