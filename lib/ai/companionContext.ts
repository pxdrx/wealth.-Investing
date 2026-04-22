/**
 * Shared context fetcher for the Dexter Companion endpoints.
 * Both `/api/ai/companion` (streaming chat) and
 * `/api/ai/companion/briefing` (one-shot JSON) use this to assemble the
 * CompanionContext that feeds buildCompanionSystem().
 *
 * All fetches are best-effort with Promise.allSettled — if any source fails
 * we degrade silently rather than 500. RLS is enforced by the supabase client
 * the caller passes in (which was created with the user's JWT).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompanionContext,
  CompanionHeadline,
  CompanionMacroEvent,
  CompanionOpenPosition,
} from "./companionPrompt";

interface OwnedAccount {
  id: string;
  name: string | null;
  kind: string | null;
  currency?: string | null;
}

function relativeWhen(iso: string | null): string | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  const diffMs = target - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 0) return "já saiu";
  if (diffMin < 60) return `em ${diffMin}min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `em ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `em ${diffD}d`;
}

/**
 * Brazilian-day bounds in UTC for the "today" P&L window.
 * BRT is UTC-3 (no DST since 2019).
 */
function brtDayBoundsUtc(): { startUtc: string; endUtc: string } {
  const now = new Date();
  const brtOffsetMs = -3 * 60 * 60 * 1000;
  const brtNow = new Date(now.getTime() + brtOffsetMs);
  const y = brtNow.getUTCFullYear();
  const m = brtNow.getUTCMonth();
  const d = brtNow.getUTCDate();
  const startBrt = Date.UTC(y, m, d, 0, 0, 0, 0);
  const endBrt = Date.UTC(y, m, d, 23, 59, 59, 999);
  return {
    startUtc: new Date(startBrt - brtOffsetMs).toISOString(),
    endUtc: new Date(endBrt - brtOffsetMs).toISOString(),
  };
}

async function fetchTodayStats(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
): Promise<{ pnl: number | null; count: number }> {
  const { startUtc, endUtc } = brtDayBoundsUtc();
  const { data, error } = await supabase
    .from("journal_trades")
    .select("net_pnl_usd, pnl_usd, closed_at")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .gte("closed_at", startUtc)
    .lte("closed_at", endUtc);
  if (error || !data) return { pnl: null, count: 0 };
  if (data.length === 0) return { pnl: null, count: 0 };
  const rows = data as Array<{
    net_pnl_usd: number | null;
    pnl_usd: number | null;
    closed_at: string | null;
  }>;
  const pnl = rows.reduce(
    (sum, t) => sum + (t.net_pnl_usd ?? t.pnl_usd ?? 0),
    0,
  );
  return { pnl, count: rows.length };
}

async function fetchOpenPositions(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
): Promise<CompanionOpenPosition[]> {
  const { data, error } = await supabase
    .from("journal_trades")
    .select("symbol, direction, opened_at, pnl_usd, net_pnl_usd, exit_price, closed_at")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];
  return (data as Array<{
    symbol: string | null;
    direction: "long" | "short" | null;
    opened_at: string | null;
    pnl_usd: number | null;
    net_pnl_usd: number | null;
  }>).map((t) => ({
    symbol: t.symbol ?? "—",
    direction: t.direction,
    opened_at: t.opened_at,
    unrealized_pnl_usd: t.net_pnl_usd ?? t.pnl_usd ?? null,
  }));
}

async function fetchMacroContext(
  supabase: SupabaseClient,
): Promise<{ nextEvent: CompanionMacroEvent | null; headlines: CompanionHeadline[] }> {
  const nowIso = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [eventsRes, headlinesRes] = await Promise.allSettled([
    supabase
      .from("economic_events")
      .select("title, country, date, time, impact")
      .gte("date", nowIso.slice(0, 10))
      .lte("date", in24h.slice(0, 10))
      .in("impact", ["high", "medium"])
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(10),
    supabase
      .from("macro_headlines")
      .select("title, source, published_at")
      .gte("published_at", since24h)
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  let nextEvent: CompanionMacroEvent | null = null;
  if (eventsRes.status === "fulfilled" && eventsRes.value.data) {
    const rows = eventsRes.value.data as Array<{
      title: string;
      country: string | null;
      date: string;
      time: string | null;
      impact: string | null;
    }>;
    const upcoming = rows.find((e) => {
      if (!e.date) return false;
      const t = e.time && /^\d{1,2}:\d{2}/.test(e.time) ? e.time : "23:59";
      const dt = new Date(`${e.date}T${t}:00-04:00`);
      return !Number.isNaN(dt.getTime()) && dt.getTime() > Date.now();
    });
    if (upcoming) {
      const t = upcoming.time && /^\d{1,2}:\d{2}/.test(upcoming.time) ? upcoming.time : "23:59";
      const releaseAt = new Date(`${upcoming.date}T${t}:00-04:00`).toISOString();
      nextEvent = {
        title: upcoming.title,
        country: upcoming.country,
        release_at: releaseAt,
        whenRelative: relativeWhen(releaseAt),
        impact: upcoming.impact,
      };
    }
  }

  let headlines: CompanionHeadline[] = [];
  if (headlinesRes.status === "fulfilled" && headlinesRes.value.data) {
    headlines = (headlinesRes.value.data as Array<{
      title: string | null;
      source: string | null;
      published_at: string | null;
    }>)
      .filter((h): h is { title: string; source: string; published_at: string | null } =>
        typeof h.title === "string" && typeof h.source === "string")
      .map((h) => ({
        title: h.title,
        source: h.source,
        published_at: h.published_at,
      }));
  }

  return { nextEvent, headlines };
}

/**
 * Assemble the CompanionContext for a given user + account.
 * Returns null only if account ownership fails — individual data source
 * failures are swallowed and replaced with empty/null defaults.
 */
export async function assembleCompanionContext(
  supabase: SupabaseClient,
  userId: string,
  accountId: string | null,
): Promise<{ ctx: CompanionContext; account: OwnedAccount | null }> {
  let account: OwnedAccount | null = null;
  if (accountId) {
    const { data } = await supabase
      .from("accounts")
      .select("id, name, kind")
      .eq("id", accountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      account = data as OwnedAccount;
    }
  }

  const [todayStatsRes, openPositionsRes, macroRes] = await Promise.allSettled([
    account ? fetchTodayStats(supabase, userId, account.id) : Promise.resolve({ pnl: null, count: 0 }),
    account ? fetchOpenPositions(supabase, userId, account.id) : Promise.resolve([] as CompanionOpenPosition[]),
    fetchMacroContext(supabase),
  ]);

  const today =
    todayStatsRes.status === "fulfilled"
      ? todayStatsRes.value
      : { pnl: null, count: 0 };
  const openPositions =
    openPositionsRes.status === "fulfilled" ? openPositionsRes.value : [];
  const macro =
    macroRes.status === "fulfilled"
      ? macroRes.value
      : { nextEvent: null, headlines: [] as CompanionHeadline[] };

  const ctx: CompanionContext = {
    accountName: account?.name ?? "Conta",
    accountCurrency: "USD",
    todayPnlUsd: today.pnl,
    todayTradeCount: today.count,
    openPositions,
    nextEvent: macro.nextEvent,
    recentHeadlines: macro.headlines,
    mood: null,
  };

  return { ctx, account };
}
