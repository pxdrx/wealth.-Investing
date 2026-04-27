// Daily scan: enrolls users canceled within the last 24h into the churn
// sequence. Idempotent via email_logs lookup for churn.day0.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { scheduleChurn } from "@/email-engine/sequences/churn";

export const runtime = "nodejs";
export const maxDuration = 60;

const ONE_DAY_MS = 86400_000;

async function handle(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const since = new Date(Date.now() - ONE_DAY_MS).toISOString();

  const { data: canceled } = await supabase
    .from("subscriptions")
    .select("user_id, status, updated_at")
    .eq("status", "canceled")
    .gte("updated_at", since);

  const candidateIds = (canceled ?? []).map((r: { user_id: string }) => r.user_id);
  if (candidateIds.length === 0) {
    return NextResponse.json({ ok: true, eligible: 0, enrolled: 0 });
  }

  // Already-enrolled filter.
  const { data: priorLogs } = await supabase
    .from("email_logs")
    .select("user_id")
    .eq("template", "churn.day0")
    .in("user_id", candidateIds);
  const alreadySent = new Set<string>(
    (priorLogs ?? []).map((r: { user_id: string | null }) => r.user_id ?? ""),
  );

  // Resolve emails / names.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_locale, marketing_enabled")
    .in("id", candidateIds);
  const profileMap = new Map<
    string,
    { name?: string; locale: "pt" | "en"; marketingOk: boolean }
  >();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      name: p.display_name ?? undefined,
      locale: p.preferred_locale === "en" ? "en" : "pt",
      marketingOk: p.marketing_enabled !== false,
    });
  }

  let enrolled = 0;
  let failed = 0;
  let skipped = 0;

  for (const id of candidateIds) {
    if (alreadySent.has(id)) {
      skipped++;
      continue;
    }
    const profile = profileMap.get(id);
    if (profile && !profile.marketingOk) {
      skipped++;
      continue;
    }

    const { data: userRes } = await supabase.auth.admin.getUserById(id);
    const user = userRes?.user;
    if (!user?.email) {
      skipped++;
      continue;
    }

    const firstName =
      profile?.name?.trim() ||
      user.email.split("@")[0] ||
      "amigo";
    const locale = profile?.locale === "en" ? "en-US" : "pt-BR";

    const r = await scheduleChurn({
      userId: id,
      email: user.email,
      firstName,
      locale,
    });
    if (r.errors.length === 0) enrolled++;
    else failed++;
  }

  return NextResponse.json({
    ok: true,
    eligible: candidateIds.length,
    enrolled,
    skipped,
    failed,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
