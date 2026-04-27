// Full-pipeline smoke test: real generator → real Track A renderer → Resend.
// Pulls real per-user data (last trading session, streak) — no fixtures.
// Run: npx tsx --env-file=.env.local scripts/preview-real-briefing.ts <to> [date]

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  generateDailyBriefing,
  buildDailyBriefingProps,
} from "../email-engine/generators/dailyBriefing";
import { renderTemplate } from "../email-engine/render";

function brDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function brToday(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

async function main() {
  const TO = process.argv[2] ?? "phalmeidapinheiro2004@gmail.com";
  const dateArg = process.argv[3];
  const target = dateArg ? new Date(`${dateArg}T12:00:00-03:00`) : new Date(Date.now() + 86_400_000);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  console.log(`[preview-real] generating for ${target.toISOString().slice(0, 10)}…`);
  const payload = await generateDailyBriefing(target);

  console.log(`[preview-real] payload`, {
    date: payload.date,
    bias: payload.marketBias,
    edition: payload.editionNumber,
    events: payload.today.length,
    headlines: payload.headlines.length,
    assetImpacts: payload.assetImpacts.length,
  });

  // Resolve user → display_name + last-session + streak.
  const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const user = usersPage?.users.find((u) => u.email === TO);
  if (!user) {
    console.error(`[preview-real] user not found: ${TO}`);
    process.exit(2);
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const firstName =
    profile?.display_name?.toString().trim().split(/\s+/)[0] ||
    TO.split("@")[0] ||
    undefined;

  // Last trading session within last 7d (skip weekends auto since no trades).
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const todayStart = `${brToday(0)}T00:00:00-03:00`;
  const { data: trades } = await sb
    .from("journal_trades")
    .select("opened_at, pnl_usd, net_pnl_usd")
    .eq("user_id", user.id)
    .gte("opened_at", sevenDaysAgo)
    .lt("opened_at", todayStart);

  const byDay = new Map<string, { trades: number; pnl: number; winners: number }>();
  for (const t of (trades ?? []) as Array<{
    opened_at: string;
    pnl_usd: number | null;
    net_pnl_usd: number | null;
  }>) {
    const d = brDate(t.opened_at);
    const cur = byDay.get(d) ?? { trades: 0, pnl: 0, winners: 0 };
    const pnl = t.net_pnl_usd ?? t.pnl_usd ?? 0;
    cur.trades++;
    cur.pnl += pnl;
    if (pnl > 0) cur.winners++;
    byDay.set(d, cur);
  }

  let yesterdaySession;
  const dates = Array.from(byDay.keys()).sort().reverse();
  if (dates.length > 0) {
    const latest = dates[0];
    const agg = byDay.get(latest)!;
    yesterdaySession = {
      trades: agg.trades,
      pnl: Math.round(agg.pnl),
      winRate: Math.round((agg.winners / agg.trades) * 100),
      date: latest,
    };
  }

  // Streak: consecutive BR days ending yesterday with at least one trade.
  const { data: lastTrades } = await sb
    .from("journal_trades")
    .select("opened_at")
    .eq("user_id", user.id)
    .order("opened_at", { ascending: false })
    .limit(100);
  const dayset = new Set<string>();
  for (const r of (lastTrades ?? []) as Array<{ opened_at: string }>) {
    dayset.add(brDate(r.opened_at));
  }
  let streakDays = 0;
  let off = -1;
  while (dayset.has(brToday(off))) {
    streakDays++;
    off--;
  }
  const streak = streakDays > 0 ? { days: streakDays, nextMarker: streakDays < 7 ? 7 : 30 } : undefined;

  console.log(`[preview-real] user data`, { firstName, yesterdaySession, streak });

  const props = buildDailyBriefingProps({
    payload,
    plan: "ultra",
    unsubscribeUrl: `https://owealthinvesting.com/api/unsubscribe?token=preview`,
    appUrl: "https://owealthinvesting.com/app",
    firstName,
    yesterdaySession,
    streak,
  });

  const rendered = await renderTemplate("daily-briefing", props);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const r = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "wealth.Investing <briefing@owealthinvesting.com>",
    to: TO,
    subject: `[REAL DATA] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    headers: { "List-Unsubscribe": "<mailto:unsubscribe@owealthinvesting.com>" },
  });

  console.log("[preview-real] sent", r);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
