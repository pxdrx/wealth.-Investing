import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { sendEmail } from "@/lib/email/send";
import { renderWeeklyReport } from "@/lib/email/templates/weekly-report";
import { acquireCronLock } from "@/lib/cron-lock";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Test mode: ?test_email=user@example.com — sends only to that email (skips subscription check)
  const testEmail = req.nextUrl.searchParams.get("test_email");

  if (!testEmail && !(await acquireCronLock("weekly-report"))) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  // Only run on Sunday (UTC). Skip otherwise unless test_email provided.
  const utcDay = new Date().getUTCDay();
  if (!testEmail && utcDay !== 0) {
    console.log("[weekly-report] skipped — not Sunday (utcDay=", utcDay, ")");
    return NextResponse.json({ ok: true, skipped: "not_sunday", utcDay });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Calculate week range (last 7 days) using Brasilia time (UTC-3)
  const utcNow = new Date();
  const brOffset = -3 * 60;
  const now = new Date(utcNow.getTime() + (brOffset + utcNow.getTimezoneOffset()) * 60000);

  const endOfWeek = new Date(now);
  endOfWeek.setHours(23, 59, 59, 999);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const startStr = startOfWeek.toISOString();
  const endStr = endOfWeek.toISOString();

  const fmt = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" }).format(d);
  const fmtYear = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(d);
  const weekLabel = `${fmt(startOfWeek)} — ${fmtYear(utcNow)}`;

  // Get target users: test mode = single user, production = all Pro+
  let subs: { user_id: string; plan: string; status: string }[] | null;

  if (testEmail) {
    // Find user by email via admin API
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const testUser = allUsers?.find((u) => u.email === testEmail);
    if (!testUser) {
      return NextResponse.json({ ok: false, error: `User not found: ${testEmail}` }, { status: 404 });
    }
    subs = [{ user_id: testUser.id, plan: "pro", status: "active" }];
  } else {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id, plan, status")
      .in("status", ["active", "trialing"])
      .in("plan", ["pro", "ultra"]);
    subs = data;
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "No Pro+ users" });
  }

  const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr || !users) {
    return NextResponse.json({ ok: false, error: "Failed to list users" }, { status: 500 });
  }

  const userMap = new Map(users.map((u) => [u.id, u]));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name");

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.display_name) profileMap.set(p.id, p.display_name);
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subs) {
    const user = userMap.get(sub.user_id);
    if (!user?.email || !user.email_confirmed_at) {
      skipped++;
      continue;
    }

    const displayName = profileMap.get(user.id) ?? "Trader";

    // Get this week's trades
    const { data: weekTrades } = await supabase
      .from("journal_trades")
      .select("symbol, pnl_usd")
      .eq("user_id", user.id)
      .gte("opened_at", startStr)
      .lte("opened_at", endStr)
      .order("pnl_usd", { ascending: false });

    const trades = weekTrades ?? [];
    const totalTrades = trades.length;
    const totalPnl = trades.reduce((sum: number, t: { pnl_usd: number }) => sum + t.pnl_usd, 0);
    const winners = trades.filter((t: { pnl_usd: number }) => t.pnl_usd > 0).length;
    const winRate = totalTrades > 0 ? Math.round((winners / totalTrades) * 100) : 0;

    const bestTrade = trades.length > 0 ? { symbol: trades[0].symbol, pnl: trades[0].pnl_usd } : null;
    const worstTrade = trades.length > 0
      ? { symbol: trades[trades.length - 1].symbol, pnl: trades[trades.length - 1].pnl_usd }
      : null;

    // Get all-time stats
    const { count: totalTradesAllTime } = await supabase
      .from("journal_trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: firstTrade } = await supabase
      .from("journal_trades")
      .select("opened_at")
      .eq("user_id", user.id)
      .order("opened_at", { ascending: true })
      .limit(1);

    const firstDate = firstTrade?.[0]?.opened_at ? new Date(firstTrade[0].opened_at) : now;
    const monthsOfData = Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / (30.44 * 86400000)));

    // Streak
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
      const checkDate = new Date(now);
      while (dateSet.has(checkDate.toISOString().split("T")[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    const html = renderWeeklyReport({
      displayName,
      weekLabel,
      totalTrades,
      totalPnl,
      winRate,
      bestTrade,
      worstTrade: worstTrade && worstTrade.pnl < 0 ? worstTrade : null,
      streak,
      totalTradesAllTime: totalTradesAllTime ?? 0,
      monthsOfData,
    });

    const success = await sendEmail({
      to: user.email,
      subject: `📊 Seu relatório semanal — ${weekLabel}`,
      html,
    });

    if (success) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
