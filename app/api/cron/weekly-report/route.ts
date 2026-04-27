// Weekly recap cron — Track B refactor.
// Schedule: 0 21 * * 0 (UTC) = 18:00 BRT, Sunday.
// URL preserved as /api/cron/weekly-report.

import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { subDays } from "date-fns";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { acquireCronLock } from "@/lib/cron-lock";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe-token";
import { send } from "@/email-engine/integrations/resend";
import { generateWeeklyRecap } from "@/email-engine/generators/weeklyRecap";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const testEmail = req.nextUrl.searchParams.get("test_email");
  const dryRun = req.nextUrl.searchParams.get("dry_run") === "true";

  if (!testEmail && !(await acquireCronLock("weekly-report"))) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  // Sundays only.
  const utcDay = new Date().getUTCDay();
  if (!testEmail && utcDay !== 0) {
    return NextResponse.json({ ok: true, skipped: "not_sunday", utcDay });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const weekStart = subDays(now, 7);

  // Recap goes to all users with email confirmed (free + paid). Track B
  // contract has no plan-gating on weekly recap; the per-user data
  // density (own trades) is intrinsic gating. Future: gate via
  // recap_enabled flag on profiles.
  const allUsers: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000, page });
    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Failed to list users" }, { status: 500 });
    }
    allUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const targets = testEmail
    ? allUsers.filter((u) => u.email === testEmail)
    : allUsers.filter((u) => !!u.email && !!u.email_confirmed_at);

  if (testEmail && targets.length === 0) {
    return NextResponse.json({ ok: false, error: `User not found: ${testEmail}` }, { status: 404 });
  }

  // Opt-out + per-channel flag.
  const { data: optOuts } = await supabase.from("email_opt_outs").select("email");
  const optOutSet = new Set<string>(
    (optOuts ?? []).map((o: { email: string }) => o.email.toLowerCase()),
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, recap_enabled");
  const displayNameMap = new Map<string, string>();
  const recapEnabledMap = new Map<string, boolean>();
  for (const p of profiles ?? []) {
    if (p.display_name) displayNameMap.set(p.id, p.display_name);
    recapEnabledMap.set(p.id, p.recap_enabled !== false);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of targets) {
    const email = user.email!;
    if (optOutSet.has(email.toLowerCase())) {
      skipped++;
      continue;
    }
    if (recapEnabledMap.get(user.id) === false) {
      skipped++;
      continue;
    }

    const firstName =
      displayNameMap.get(user.id) ?? email.split("@")[0] ?? "Trader";

    let props;
    try {
      props = await generateWeeklyRecap({
        userId: user.id,
        email,
        firstName,
        weekEnd: now,
        unsubscribeUrl: buildUnsubscribeUrl(email),
      });
    } catch (err) {
      console.error("[weekly-report] generator failed for", email, err);
      failed++;
      continue;
    }

    if (dryRun) {
      sent++;
      continue;
    }

    const r = await send({
      template: "weekly-recap",
      props,
      to: email,
    });

    await supabase.from("email_logs").insert({
      user_id: user.id,
      template: "weekly-recap",
      to_email: email,
      status: r.ok ? "sent" : "failed",
      error: r.ok ? null : r.error ?? "send failed",
    });

    if (r.ok) sent++;
    else failed++;

    // Throttle to stay under Resend's 10 req/s.
    await new Promise((res) => setTimeout(res, 100));
  }

  return NextResponse.json({
    ok: true,
    targets: targets.length,
    sent,
    skipped,
    failed,
    weekStart: weekStart.toISOString(),
    weekEnd: now.toISOString(),
    dryRun,
  });
}

// Vercel Cron dispatches GET; mirror to POST handler.
export { POST as GET };
