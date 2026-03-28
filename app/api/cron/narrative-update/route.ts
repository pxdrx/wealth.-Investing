// app/api/cron/narrative-update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { generateAdaptiveUpdate } from "@/lib/macro/narrative-generator";
import { getWeekStart } from "@/lib/macro/constants";
import { requireEnv } from "@/lib/env";
import { invalidateCache } from "@/lib/cache";
import type { EconomicEvent } from "@/lib/macro/types";

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await req.json().catch(() => ({}));
    const eventId = body.event_id;

    if (!eventId) {
      return NextResponse.json({ ok: false, error: "Missing event_id" }, { status: 400 });
    }

    // Get the event
    const { data: event } = await supabase
      .from("economic_events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
    }

    // Get current panorama
    const weekStart = getWeekStart();
    const { data: panorama } = await supabase
      .from("weekly_panoramas")
      .select("*")
      .filter("week_start", "eq", weekStart)
      .maybeSingle();

    if (!panorama || panorama.is_frozen) {
      return NextResponse.json({ ok: true, message: "No panorama or frozen" });
    }

    // Generate adaptive update
    const update = await generateAdaptiveUpdate(
      event as EconomicEvent,
      panorama.narrative
    );

    // Create adaptive alert
    await supabase.from("adaptive_alerts").insert({
      type: "breaking",
      title: update.alert_title,
      description: update.update_text,
      event_id: eventId,
      week_start: weekStart,
    });

    // Append update to narrative
    const updatedNarrative = `${panorama.narrative}\n\n---\n**Atualização (${new Date().toLocaleString("pt-BR")}):** ${update.update_text}`;
    await supabase
      .from("weekly_panoramas")
      .update({ narrative: updatedNarrative, updated_at: new Date().toISOString() })
      .eq("id", panorama.id);

    // Invalidate Redis cache after panorama update
    await invalidateCache("macro:panorama");

    return NextResponse.json({ ok: true, alert: update.alert_title });
  } catch (error) {
    console.error("[narrative-update] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
