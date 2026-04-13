import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { sendEmail } from "@/lib/email/send";
import { renderMorningBriefing } from "@/lib/email/templates/morning-briefing";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Test mode: ?test_email=user@example.com — sends only to that email
  const testEmail = req.nextUrl.searchParams.get("test_email");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Get today's economic events
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const { data: events } = await supabase
    .from("economic_events")
    .select("time, title, impact, currency")
    .gte("date", todayStr)
    .lte("date", todayStr)
    .order("time", { ascending: true });

  // Get users: test mode = single user, production = all users
  const { data: { users: allUsers }, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr || !allUsers) {
    return NextResponse.json({ ok: false, error: "Failed to list users" }, { status: 500 });
  }

  const users = testEmail
    ? allUsers.filter((u) => u.email === testEmail)
    : allUsers;

  if (testEmail && users.length === 0) {
    return NextResponse.json({ ok: false, error: `User not found: ${testEmail}` }, { status: 404 });
  }

  // Get subscriptions for plan checks
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, plan, status");

  const subMap = new Map<string, string>();
  for (const sub of subs ?? []) {
    if (sub.status === "active" || sub.status === "trialing") {
      subMap.set(sub.user_id, sub.plan);
    }
  }

  // Get profiles for display names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name");

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.display_name) profileMap.set(p.id, p.display_name);
  }

  let sent = 0;
  let skipped = 0;

  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  for (const user of users) {
    if (!user.email || !user.email_confirmed_at) {
      skipped++;
      continue;
    }

    const plan = subMap.get(user.id) ?? "free";
    const isPro = plan === "pro" || plan === "ultra";
    const displayName = profileMap.get(user.id) ?? "Trader";

    // Get yesterday's trades for this user (Pro only)
    let yesterdaySummary: { trades: number; pnl: number; winRate: number } | undefined;
    if (isPro) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const { data: trades } = await supabase
        .from("journal_trades")
        .select("pnl_usd")
        .eq("user_id", user.id)
        .gte("opened_at", `${yesterdayStr}T00:00:00`)
        .lt("opened_at", `${todayStr}T00:00:00`);

      if (trades && trades.length > 0) {
        const totalPnl = trades.reduce((sum: number, t: { pnl_usd: number }) => sum + t.pnl_usd, 0);
        const winners = trades.filter((t: { pnl_usd: number }) => t.pnl_usd > 0).length;
        yesterdaySummary = {
          trades: trades.length,
          pnl: totalPnl,
          winRate: Math.round((winners / trades.length) * 100),
        };
      }
    }

    // Calculate streak
    const { data: tradeDates } = await supabase
      .from("journal_trades")
      .select("opened_at")
      .eq("user_id", user.id)
      .order("opened_at", { ascending: false })
      .limit(100);

    let streak = 0;
    if (tradeDates && tradeDates.length > 0) {
      const dateSet = new Set<string>();
      for (const row of tradeDates) {
        dateSet.add(new Date(row.opened_at).toISOString().split("T")[0]);
      }
      const checkDate = new Date(today);
      // Check from yesterday backwards (morning briefing = before today's trades)
      checkDate.setDate(checkDate.getDate() - 1);
      while (dateSet.has(checkDate.toISOString().split("T")[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    const formattedEvents = (events ?? []).map((e: { time: string; title: string; impact: string; currency: string }) => ({
      time: e.time ?? "",
      title: e.title,
      impact: e.impact,
      currency: e.currency,
    }));

    const html = renderMorningBriefing({
      displayName,
      date: formattedDate,
      events: formattedEvents,
      yesterdaySummary,
      streak,
      isPro,
    });

    const success = await sendEmail({
      to: user.email,
      subject: `☀️ Briefing ${formattedDate}`,
      html,
    });

    if (success) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
