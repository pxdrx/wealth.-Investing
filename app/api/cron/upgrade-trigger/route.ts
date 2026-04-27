// Daily scan: enrolls eligible Free users into the upgrade sequence.
// Eligibility: signed in within last 7 days AND signup >= 30 days ago AND
// no existing upgrade.day0 row in email_logs (single-run per user).

import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { scheduleUpgrade } from "@/email-engine/sequences/upgrade";
import type { Plan } from "@/email-engine/__mocks__/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEVEN_DAYS_MS = 7 * 86400_000;
const THIRTY_DAYS_MS = 30 * 86400_000;

function planFromSub(plan: string | undefined | null): Plan {
  if (plan === "pro") return "pro";
  if (plan === "elite" || plan === "ultra") return "ultra";
  return "free";
}

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

  const now = Date.now();

  const allUsers: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000, page });
    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Failed to list users" }, { status: 500 });
    }
    allUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }

  // Active subs map.
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, plan, status");
  const planMap = new Map<string, string>();
  for (const sub of subs ?? []) {
    if (sub.status === "active" || sub.status === "trialing") {
      planMap.set(sub.user_id, sub.plan);
    }
  }

  // Already-emailed set (idempotency).
  const { data: priorLogs } = await supabase
    .from("email_logs")
    .select("user_id")
    .eq("template", "upgrade.day0");
  const alreadySent = new Set<string>(
    (priorLogs ?? []).map((r: { user_id: string | null }) => r.user_id ?? ""),
  );

  // Profile names + locales.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_locale, marketing_enabled");
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

  const eligible: { user: User; plan: Plan }[] = [];
  for (const user of allUsers) {
    if (!user.email) continue;
    if (alreadySent.has(user.id)) continue;
    const profile = profileMap.get(user.id);
    if (profile && !profile.marketingOk) continue;

    const planStr = planMap.get(user.id);
    const plan = planFromSub(planStr);
    if (plan !== "free") continue;

    const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
    if (now - lastSignIn > SEVEN_DAYS_MS) continue;

    const created = user.created_at ? Date.parse(user.created_at) : now;
    if (now - created < THIRTY_DAYS_MS) continue;

    eligible.push({ user, plan: "free" });
  }

  let enrolled = 0;
  let failed = 0;
  for (const { user } of eligible) {
    const profile = profileMap.get(user.id);
    const firstName =
      profile?.name?.trim() ||
      user.email!.split("@")[0] ||
      "amigo";
    const locale = profile?.locale === "en" ? "en-US" : "pt-BR";

    const r = await scheduleUpgrade({
      userId: user.id,
      email: user.email!,
      firstName,
      locale,
      currentPlan: "free",
      targetPlan: "pro",
    });
    if (r.errors.length === 0) enrolled++;
    else failed++;
  }

  return NextResponse.json({
    ok: true,
    totalUsers: allUsers.length,
    eligible: eligible.length,
    enrolled,
    failed,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
