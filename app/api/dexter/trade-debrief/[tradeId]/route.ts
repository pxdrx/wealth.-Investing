import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { redis } from "@/lib/redis";
import { hasAccess } from "@/lib/entitlements";
import type { Plan } from "@/lib/subscription-shared";
import {
  buildDebriefSystemPrompt,
  buildDebriefUserPrompt,
  fallbackDebrief,
  parseDebriefJson,
  type DebriefContext,
  type DebriefMood,
  type SimilarTrade,
  type TradeSnapshot,
} from "@/lib/dexter/tradeDebriefPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEXTER_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 200;
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

interface DebriefPayload {
  insight: string;
  pattern: string;
  mood: DebriefMood;
  cacheHit: boolean;
  fallback?: boolean;
  generatedAt: string;
}

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

function hashPayload(trade: TradeSnapshot): string {
  const payload = [
    trade.symbol ?? "",
    trade.direction ?? "",
    trade.netPnlUsd.toFixed(2),
    trade.context ?? "",
    trade.notes ?? "",
    (trade.mistakes ?? []).join("|"),
    (trade.customTags ?? []).join("|"),
    trade.emotion ?? "",
    trade.setupQuality ?? "",
  ].join("::");
  return createHash("sha1").update(payload).digest("hex").slice(0, 12);
}

function detectLocale(req: NextRequest, profileLocale: string | null): "pt" | "en" {
  if (profileLocale?.toLowerCase().startsWith("pt")) return "pt";
  if (profileLocale?.toLowerCase().startsWith("en")) return "en";
  const accept = req.headers.get("accept-language")?.toLowerCase() ?? "";
  if (accept.startsWith("en")) return "en";
  return "pt";
}

function computeDurationMinutes(openedAt: string | null, closedAt: string | null): number | null {
  if (!openedAt || !closedAt) return null;
  const a = new Date(openedAt).getTime();
  const b = new Date(closedAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.round((b - a) / 60000);
}

export async function GET(
  req: NextRequest,
  ctx: { params: { tradeId: string } }
) {
  const tradeId = ctx.params.tradeId;
  if (!tradeId || !/^[0-9a-f-]{8,}$/i.test(tradeId)) {
    return Response.json({ ok: false, error: "invalid_trade_id" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseClientForUser(token);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ ok: false, error: "invalid_session" }, { status: 401 });
  }
  const userId = user.id;

  // Plan lookup (server-side mirror of SubscriptionContext coercion)
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();
  const rawPlan = (sub?.plan as Plan | undefined) ?? "free";
  const active = sub?.status === "active" || sub?.status === "trialing";
  const plan: Plan = active ? rawPlan : "free";

  if (!hasAccess(plan, "dexterTradeDebrief")) {
    return Response.json(
      { ok: false, error: "entitlement_required" },
      { status: 403 }
    );
  }

  // Fetch the trade (RLS enforces user ownership; keep explicit user_id for safety)
  const { data: tradeRow, error: tradeErr } = await supabase
    .from("journal_trades")
    .select(
      "id, symbol, direction, opened_at, closed_at, pnl_usd, net_pnl_usd, fees_usd, context, notes, mistakes, emotion, setup_quality, custom_tags, risk_usd, rr_realized"
    )
    .eq("id", tradeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (tradeErr || !tradeRow) {
    return Response.json({ ok: false, error: "trade_not_found" }, { status: 404 });
  }

  const netPnl =
    typeof tradeRow.net_pnl_usd === "number"
      ? tradeRow.net_pnl_usd
      : (tradeRow.pnl_usd ?? 0) + (tradeRow.fees_usd ?? 0);

  const trade: TradeSnapshot = {
    symbol: tradeRow.symbol ?? null,
    direction:
      tradeRow.direction === "buy" || tradeRow.direction === "sell"
        ? tradeRow.direction
        : null,
    netPnlUsd: netPnl,
    riskUsd: tradeRow.risk_usd ?? null,
    rrRealized: tradeRow.rr_realized ?? null,
    openedAt: tradeRow.opened_at ?? null,
    closedAt: tradeRow.closed_at ?? null,
    durationMinutes: computeDurationMinutes(tradeRow.opened_at, tradeRow.closed_at),
    context: tradeRow.context ?? null,
    notes: tradeRow.notes ?? null,
    mistakes: Array.isArray(tradeRow.mistakes) ? (tradeRow.mistakes as string[]) : null,
    emotion: tradeRow.emotion ?? null,
    customTags: Array.isArray(tradeRow.custom_tags)
      ? (tradeRow.custom_tags as string[])
      : null,
    setupQuality: tradeRow.setup_quality ?? null,
  };

  // Cache lookup
  const payloadHash = hashPayload(trade);
  const cacheKey = `dexter:debrief:v1:${tradeId}:${payloadHash}`;
  const cached = (await redis.get(cacheKey)) as DebriefPayload | null;
  if (cached && typeof cached === "object" && typeof cached.insight === "string") {
    return Response.json({ ok: true, ...cached, cacheHit: true });
  }

  // Similar recent trades (same symbol, last 4 excluding this one)
  let recentSameSymbol: SimilarTrade[] = [];
  if (trade.symbol) {
    const { data: similar } = await supabase
      .from("journal_trades")
      .select("symbol, direction, net_pnl_usd, pnl_usd, fees_usd, closed_at")
      .eq("user_id", userId)
      .eq("symbol", trade.symbol)
      .neq("id", tradeId)
      .order("closed_at", { ascending: false, nullsFirst: false })
      .limit(4);
    if (similar) {
      recentSameSymbol = similar.map(
        (t: {
          symbol: string | null;
          direction: string | null;
          net_pnl_usd: number | null;
          pnl_usd: number | null;
          fees_usd: number | null;
          closed_at: string | null;
        }) => ({
          symbol: t.symbol,
          direction:
            t.direction === "buy" || t.direction === "sell" ? t.direction : null,
          netPnlUsd:
            typeof t.net_pnl_usd === "number"
              ? t.net_pnl_usd
              : (t.pnl_usd ?? 0) + (t.fees_usd ?? 0),
          closedAt: t.closed_at,
        })
      );
    }
  }

  // Locale
  let profileLocale: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("locale")
      .eq("user_id", userId)
      .maybeSingle();
    profileLocale = (profile as { locale?: string | null } | null)?.locale ?? null;
  } catch {
    // locale column may not exist yet
  }
  const locale = detectLocale(req, profileLocale);

  const debriefCtx: DebriefContext = { plan, trade, recentSameSymbol, locale };

  // Anthropic call (with fallback if key missing or call fails)
  const useFallback = !process.env.ANTHROPIC_API_KEY;
  let insightData = useFallback ? fallbackDebrief(trade, locale) : null;
  let isFallback = useFallback;

  if (!insightData) {
    try {
      const response = await getAnthropic().messages.create({
        model: DEXTER_MODEL,
        max_tokens: MAX_TOKENS,
        system: buildDebriefSystemPrompt(locale),
        messages: [{ role: "user", content: buildDebriefUserPrompt(debriefCtx) }],
      });
      const textBlock = response.content.find((b) => b.type === "text");
      const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
      insightData = parseDebriefJson(raw);
    } catch (err) {
      console.warn("[dexter/trade-debrief] Anthropic error:", err);
    }

    if (!insightData) {
      insightData = fallbackDebrief(trade, locale);
      isFallback = true;
    }
  }

  const payload: DebriefPayload = {
    insight: insightData.insight,
    pattern: insightData.pattern,
    mood: insightData.mood,
    cacheHit: false,
    generatedAt: new Date().toISOString(),
    ...(isFallback ? { fallback: true } : {}),
  };

  // Only cache non-fallback responses (fallback should regen next time)
  if (!isFallback) {
    try {
      await redis.set(cacheKey, payload, { ex: CACHE_TTL_SECONDS });
    } catch (err) {
      console.warn("[dexter/trade-debrief] cache write error:", err);
    }
  }

  return Response.json({ ok: true, ...payload });
}
