// app/api/macro/check-rate-update/route.ts
// Smart rate update: only scrapes TE when a rate decision event happened 1.5h+ ago today.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeTradingEconomicsRates } from "@/lib/macro/scrapers/te-rates";
import { verifyCronAuth } from "@/lib/macro/cron-auth";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // 1. Check if there are rate decision events today
    const { data: rateEvents } = await supabase
      .from("economic_events")
      .select("title, country, date, time")
      .eq("date", today)
      .or(
        "title.ilike.%interest rate%,title.ilike.%rate decision%,title.ilike.%policy rate%,title.ilike.%cash rate%,title.ilike.%base rate%,title.ilike.%selic%"
      );

    if (!rateEvents || rateEvents.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No rate events today",
        updated: 0,
      });
    }

    // 2. Check if any event happened 1.5h+ ago (enough time for announcement to settle)
    let needsUpdate = false;
    const triggeredEvents: string[] = [];

    for (const event of rateEvents) {
      if (!event.time || event.time === "All Day" || event.time === "Tentative") {
        continue;
      }

      // Parse event time -- assume times are in UTC or close enough
      const timeParts = event.time.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeParts) continue;

      const eventDateTime = new Date(`${event.date}T${timeParts[1].padStart(2, "0")}:${timeParts[2]}:00Z`);
      const hoursSince = (now.getTime() - eventDateTime.getTime()) / (1000 * 60 * 60);

      if (hoursSince >= 1.5) {
        needsUpdate = true;
        triggeredEvents.push(`${event.title} (${event.country}, ${event.time} UTC, ${hoursSince.toFixed(1)}h ago)`);
      }
    }

    if (!needsUpdate) {
      return NextResponse.json({
        ok: true,
        message: `Found ${rateEvents.length} rate event(s) today but none are 1.5h+ old yet`,
        events: rateEvents.map((e) => `${e.title} @ ${e.time}`),
        updated: 0,
      });
    }

    console.log(`[check-rate-update] Triggered by: ${triggeredEvents.join(", ")}`);

    // 3. Scrape latest rates from TradingEconomics
    const freshRates = await scrapeTradingEconomicsRates();
    if (!freshRates || freshRates.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Scrape returned no rates (TE may be blocking or structure changed)",
        triggered_by: triggeredEvents,
        updated: 0,
      });
    }

    // 4. Merge with existing DB data to preserve last_action, next_meeting, etc.
    const { data: dbRates } = await supabase
      .from("central_bank_rates")
      .select("bank_code, current_rate, last_action, last_change_bps, last_change_date, next_meeting");

    const dbMap = new Map((dbRates ?? []).map((r) => [r.bank_code, r]));

    let updated = 0;
    const changes: string[] = [];

    for (const rate of freshRates) {
      const existing = dbMap.get(rate.bank_code);
      const oldRate = existing?.current_rate;

      // Calculate what changed
      const rateChanged = oldRate !== undefined && oldRate !== rate.current_rate;
      const bpsDiff = rateChanged && oldRate !== undefined
        ? Math.round((rate.current_rate - oldRate) * 100)
        : null;

      const updatePayload: Record<string, unknown> = {
        current_rate: rate.current_rate,
        updated_at: new Date().toISOString(),
      };

      // If rate actually changed, update last_action metadata
      if (rateChanged && bpsDiff !== null) {
        updatePayload.last_action = bpsDiff > 0 ? "hike" : "cut";
        updatePayload.last_change_bps = bpsDiff;
        updatePayload.last_change_date = today;
        changes.push(`${rate.bank_code}: ${oldRate} -> ${rate.current_rate} (${bpsDiff > 0 ? "+" : ""}${bpsDiff}bps)`);
      }

      const { error } = await supabase
        .from("central_bank_rates")
        .update(updatePayload)
        .eq("bank_code", rate.bank_code);

      if (!error) updated++;
    }

    return NextResponse.json({
      ok: true,
      message: `Updated ${updated} rates`,
      triggered_by: triggeredEvents,
      changes: changes.length > 0 ? changes : "No rate values changed",
      updated,
    });
  } catch (err) {
    console.error("[check-rate-update] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
