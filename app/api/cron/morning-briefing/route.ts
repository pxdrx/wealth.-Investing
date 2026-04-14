import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuthDetailed } from "@/lib/macro/cron-auth";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";
import { renderMorningBriefing } from "@/lib/email/templates/morning-briefing";

async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (!token || token === cronSecret) return false;
  try {
    const sb = createSupabaseClientForUser(token);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return false;
    return await isAdmin(sb, user.id);
  } catch {
    return false;
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;

function brasiliaDateStr(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + offsetDays * 86400000));
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export async function POST(req: NextRequest) {
  const auth = verifyCronAuthDetailed(req);
  let viaAdmin = false;
  if (!auth.ok) {
    if (auth.reason === "invalid_auth" && (await isAdminRequest(req))) {
      viaAdmin = true;
    } else {
      console.error("[morning-briefing] auth failed:", auth.reason);
      if (auth.reason === "missing_secret") {
        return NextResponse.json(
          { ok: false, error: "CRON_SECRET not configured on server" },
          { status: 503 },
        );
      }
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("[morning-briefing] authorized via", viaAdmin ? "admin" : "cron_secret");

  console.log("[morning-briefing] cron fired", new Date().toISOString());

  const testEmail = req.nextUrl.searchParams.get("test_email");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const todayStr = brasiliaDateStr(0);

  // Get today's economic events — if empty, look ahead up to 3 days for next events
  let events: { time: string; title: string; impact: string; currency: string; date?: string }[] | null = null;
  let eventsDateLabel = "hoje";

  for (let offset = 0; offset <= 3; offset++) {
    const checkStr = brasiliaDateStr(offset);

    const { data } = await supabase
      .from("economic_events")
      .select("time, title, impact, currency, date")
      .eq("date", checkStr)
      .order("time", { ascending: true });

    if (data && data.length > 0) {
      events = data;
      if (offset > 0) {
        const [yy, mm, dd] = checkStr.split("-").map(Number);
        const labelDate = new Date(Date.UTC(yy, mm - 1, dd, 12));
        eventsDateLabel = labelDate.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "short",
          timeZone: "America/Sao_Paulo",
        });
      }
      console.log(`[morning-briefing] found ${data.length} events for ${checkStr} (offset=${offset})`);
      break;
    }
  }

  if (!events || events.length === 0) {
    console.warn(`[morning-briefing] no events found in next 3 days starting ${todayStr}`);
  }

  // Get recent headlines (last 24h, top 5 by importance)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: headlines } = await supabase
    .from("macro_headlines")
    .select("title, source, published_at")
    .gte("published_at", oneDayAgo)
    .order("published_at", { ascending: false })
    .limit(5);

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

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  for (const user of users) {
    if (!user.email || !user.email_confirmed_at) {
      skipped++;
      continue;
    }

    const plan = subMap.get(user.id) ?? "free";
    const isPro = plan === "pro" || plan === "ultra" || plan === "mentor";
    const displayName = profileMap.get(user.id) ?? "Trader";

    // Get yesterday's trades for this user (Pro only)
    let yesterdaySummary: { trades: number; pnl: number; winRate: number } | undefined;
    if (isPro) {
      const yesterdayStr = brasiliaDateStr(-1);

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
      // Check from yesterday backwards in Brasília time
      let dayOffset = -1;
      while (dateSet.has(brasiliaDateStr(dayOffset))) {
        streak++;
        dayOffset--;
      }
    }

    const formattedEvents = (events ?? []).map((e: { time: string; title: string; impact: string; currency: string }) => ({
      time: e.time ?? "",
      title: e.title,
      impact: e.impact,
      currency: e.currency,
    }));

    const formattedHeadlines = (headlines ?? []).map((h: { title: string; source: string; published_at: string | null }) => ({
      title: h.title,
      source: h.source,
    }));

    const html = renderMorningBriefing({
      displayName,
      date: formattedDate,
      events: formattedEvents,
      eventsDateLabel,
      headlines: isPro ? formattedHeadlines : formattedHeadlines.slice(0, 2),
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
