// app/api/macro/daily-adjustment/regenerate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { runDailyAdjustment } from "@/lib/macro/daily-adjustment";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getSupabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const userClient = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const result = await runDailyAdjustment(supabase, { source: "manual", ignoreCooldown: true });

  if (!result.ok) {
    const status = result.reason === "no_red_lines" ? 200 : result.reason === "no_weekly_panorama" ? 409 : 500;
    const message =
      result.reason === "no_red_lines"
        ? "Sem red lines novas nas últimas 24h."
        : result.reason === "no_weekly_panorama"
        ? "Sem panorama semanal vigente — gere o briefing semanal primeiro."
        : result.error || "Erro ao gerar ajuste diário.";
    return NextResponse.json({ ok: false, reason: result.reason, error: message }, { status });
  }

  return NextResponse.json({ ok: true, adjustment: result.adjustment });
}
