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
import { killSwitchActive } from "@/lib/email/kill-switch";

export const runtime = "nodejs";
export const maxDuration = 300; // bumped from 60 — required for fan-out > ~30 users

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (killSwitchActive("weekly-report")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch" });
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

  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, display_name, recap_enabled");
  if (profilesErr) {
    // Fail CLOSED — if we cannot see opt-out flags, do not send to anyone.
    console.error("[weekly-report] profiles query failed", profilesErr);
    return NextResponse.json(
      { ok: false, error: "profiles query failed" },
      { status: 500 },
    );
  }
  const displayNameMap = new Map<string, string>();
  const recapEnabledMap = new Map<string, boolean>();
  for (const p of profiles ?? []) {
    if (p.display_name) displayNameMap.set(p.id, p.display_name);
    recapEnabledMap.set(p.id, p.recap_enabled !== false);
  }

  // Per-week idempotency (belt + suspenders against double-fan-out).
  const weekStart = subDays(now, 6).toISOString();
  const { data: priorLogs, error: logsErr } = await supabase
    .from("email_logs")
    .select("user_id")
    .eq("template", "weekly-recap")
    .eq("status", "sent")
    .gte("sent_at", weekStart);
  if (logsErr) {
    console.error("[weekly-report] email_logs probe failed", logsErr);
    return NextResponse.json(
      { ok: false, error: "email_logs probe failed" },
      { status: 500 },
    );
  }
  const alreadySent = new Set<string>(
    (priorLogs ?? []).map((r: { user_id: string }) => r.user_id),
  );

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
    if (!testEmail && alreadySent.has(user.id)) {
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

    let sendResult: { ok: boolean; error?: string } = { ok: false };
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        sendResult = await send({ template: "weekly-recap", props, to: email });
      } catch (err) {
        sendResult = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
      // Resend rate-limit backoff: simple linear wait.
      if (
        !sendResult.ok &&
        /rate.?limit|429/i.test(sendResult.error ?? "") &&
        attempt < 4
      ) {
        await new Promise((res) => setTimeout(res, 1000 * attempt));
        continue;
      }
      break;
    }

    const { error: logErr } = await supabase.from("email_logs").insert({
      user_id: user.id,
      template: "weekly-recap",
      to_email: email,
      status: sendResult.ok ? "sent" : "failed",
      error: sendResult.ok ? null : sendResult.error ?? "send failed",
    });
    if (logErr) {
      console.error("[weekly-report] email_logs insert failed for", email, logErr);
    }

    if (sendResult.ok) sent++;
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
    weekStart,
    weekEnd: now.toISOString(),
    dryRun,
  });
}

// Vercel Cron dispatches GET; mirror to POST handler.
export { POST as GET };
