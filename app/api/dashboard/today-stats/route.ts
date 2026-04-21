import { NextRequest } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_SECONDS = 60;
const TZ = "America/Sao_Paulo"; // TODO: per-user timezone once profiles.timezone lands.

type Mood = "calm" | "focused" | "accelerated" | "drifting" | "flow";

interface TradeDot {
  id: string;
  timestamp: string;
  pnl: number;
  instrument: string;
  side: "long" | "short";
}

interface TodayStatsPayload {
  pnl: {
    amount: number;
    currency: "USD";
    trades: number;
    winRate: number;
    sparkline: number[];
  };
  drawdown: {
    current: number | null;
    limit: number | null;
    propFirmName: string | null;
  };
  mood: { state: Mood; confidence: number };
  trades: TradeDot[];
  sessions: Array<{ market: string; openUtc: string; closeUtc: string }>;
  generatedAt: string;
}

// Returns the date string (YYYY-MM-DD) for "today" in BRT, plus UTC day bounds.
function brtDayBounds(): { dateStr: string; startUtc: string; endUtc: string } {
  // en-CA yields YYYY-MM-DD.
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // BRT is UTC-3 year-round (Brazil abolished DST in 2019).
  const startUtc = new Date(`${dateStr}T00:00:00-03:00`).toISOString();
  const endUtc = new Date(`${dateStr}T23:59:59.999-03:00`).toISOString();
  return { dateStr, startUtc, endUtc };
}

// Produces session bands anchored to today in BRT, returned as UTC ISO.
function todaySessions(dateStr: string): TodayStatsPayload["sessions"] {
  const toUtc = (hhmm: string) => new Date(`${dateStr}T${hhmm}-03:00`).toISOString();
  return [
    { market: "Tokyo",   openUtc: toUtc("08:00"), closeUtc: toUtc("10:00") },
    { market: "Londres", openUtc: toUtc("05:00"), closeUtc: toUtc("14:00") },
    { market: "Nova York", openUtc: toUtc("10:30"), closeUtc: toUtc("17:00") },
  ];
}

function computeMood(params: {
  closedDesc: Array<{ pnl: number; closedAt: string }>;
  nowMs: number;
}): { state: Mood; confidence: number } {
  const { closedDesc, nowMs } = params;
  if (closedDesc.length === 0) {
    return { state: "calm", confidence: 0.2 };
  }

  // Loss streak (most recent consecutive losses).
  let lossStreak = 0;
  for (const t of closedDesc) {
    if (t.pnl <= 0) lossStreak++;
    else break;
  }

  // Win streak (most recent consecutive wins).
  let winStreak = 0;
  for (const t of closedDesc) {
    if (t.pnl > 0) winStreak++;
    else break;
  }

  const oneHourAgo = nowMs - 60 * 60 * 1000;
  const tradesLastHour = closedDesc.filter(
    (t) => new Date(t.closedAt).getTime() >= oneHourAgo
  ).length;

  const confidence = closedDesc.length >= 5 ? 0.8 : 0.4;

  // Precedence: drifting > accelerated > flow > focused > calm.
  if (lossStreak >= 3) return { state: "drifting", confidence };
  if (tradesLastHour > 4) return { state: "accelerated", confidence };
  if (winStreak >= 3) return { state: "flow", confidence };
  if (closedDesc.length >= 2) return { state: "focused", confidence };
  return { state: "calm", confidence };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseClientForUser(token);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
  }
  const userId = user.id;

  const accountId = req.nextUrl.searchParams.get("account_id");
  if (!accountId) {
    return Response.json({ ok: false, error: "account_id_required" }, { status: 400 });
  }
  // UUID shape guard — fail fast before hitting DB.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)) {
    return Response.json({ ok: false, error: "invalid_account_id" }, { status: 400 });
  }

  // IDOR guard: confirm this account belongs to the authenticated user.
  const { data: ownedAccount } = await supabase
    .from("accounts")
    .select("id, name, kind")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!ownedAccount) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { dateStr, startUtc, endUtc } = brtDayBounds();
  const cacheKey = `dashboard:today-stats:${userId}:${accountId}:${dateStr}`;

  const cached = (await redis.get(cacheKey)) as TodayStatsPayload | null;
  if (cached && typeof cached === "object" && cached.pnl) {
    return Response.json(cached);
  }

  // Today's trades (closed today, BRT day bounds).
  const { data: tradesRaw, error: tradesErr } = await supabase
    .from("journal_trades")
    .select("id, symbol, direction, net_pnl_usd, pnl_usd, closed_at")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .gte("closed_at", startUtc)
    .lte("closed_at", endUtc)
    .order("closed_at", { ascending: true });

  if (tradesErr) {
    console.warn("[today-stats] trades fetch error:", tradesErr.message);
  }

  type TradeRow = {
    id: string;
    symbol: string | null;
    direction: "long" | "short" | null;
    net_pnl_usd: number | null;
    pnl_usd: number | null;
    closed_at: string | null;
  };
  const trades = ((tradesRaw ?? []) as TradeRow[]).filter((t) => t.closed_at !== null);

  const tradeDots: TradeDot[] = trades.map((t) => ({
    id: t.id,
    timestamp: t.closed_at as string,
    pnl: t.net_pnl_usd ?? t.pnl_usd ?? 0,
    instrument: t.symbol ?? "—",
    side: (t.direction ?? "long") as "long" | "short",
  }));

  let amount = 0;
  let wins = 0;
  const sparkline: number[] = [];
  for (const t of tradeDots) {
    amount += t.pnl;
    sparkline.push(amount);
    if (t.pnl > 0) wins++;
  }
  const winRate = tradeDots.length > 0 ? wins / tradeDots.length : 0;

  // Prop firm drawdown (only if account is prop with limits).
  let propFirmName: string | null = null;
  let dailyLimit: number | null = null;
  let currentDd: number | null = null;

  if (ownedAccount.kind === "prop") {
    const { data: propRow } = await supabase
      .from("prop_accounts")
      .select("firm_name, max_daily_loss_percent, starting_balance_usd")
      .eq("account_id", accountId)
      .maybeSingle();

    const prop = propRow as {
      firm_name: string | null;
      max_daily_loss_percent: number | null;
      starting_balance_usd: number | null;
    } | null;

    propFirmName = prop?.firm_name ?? null;
    if (prop?.max_daily_loss_percent && prop?.starting_balance_usd) {
      dailyLimit = (prop.max_daily_loss_percent / 100) * prop.starting_balance_usd;
      // Current daily DD = sum of today's net pnl if negative, else 0.
      currentDd = amount < 0 ? amount : 0;
    }
  }

  // Mood — need closed trades sorted DESC for streak detection.
  const closedDesc = [...tradeDots]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .map((t) => ({ pnl: t.pnl, closedAt: t.timestamp }));
  const mood = computeMood({ closedDesc, nowMs: Date.now() });

  const payload: TodayStatsPayload = {
    pnl: {
      amount,
      currency: "USD",
      trades: tradeDots.length,
      winRate,
      sparkline,
    },
    drawdown: {
      current: currentDd,
      limit: dailyLimit,
      propFirmName,
    },
    mood,
    trades: tradeDots,
    sessions: todaySessions(dateStr),
    generatedAt: new Date().toISOString(),
  };

  try {
    await redis.set(cacheKey, payload, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.warn("[today-stats] cache write error:", err);
  }

  return Response.json(payload);
}
