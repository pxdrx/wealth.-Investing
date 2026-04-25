import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { redis } from "@/lib/redis";
import type { Plan } from "@/lib/subscription-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEXTER_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 300;

// Cache TTLs per plan. Free users freeze on first generation of the day.
const TTL_SECONDS: Record<Plan, number> = {
  free: 24 * 60 * 60, // 24h
  pro: 4 * 60 * 60,   // 4h
  ultra: 4 * 60 * 60, // 4h
  mentor: 4 * 60 * 60,
};

type Mood = "default" | "thinking" | "alert" | "celebrating";

// In-app routes the CTA may point to. Anything else is coerced to /app/journal.
const ALLOWED_CTA_HREFS = new Set<string>([
  "/app",
  "/app/journal",
  "/app/macro",
  "/app/dexter",
  "/app/prop",
  "/app/reports",
  "/app/backtest",
  "/app/chart",
  "/app/mentor",
  "/app/news",
  "/app/account",
  "/app/settings",
  "/app/pricing",
]);

function normalizeCtaHref(href: string): string {
  // Strip query/hash for the allowlist check.
  const base = href.split(/[?#]/)[0];
  if (ALLOWED_CTA_HREFS.has(base)) return href;
  return "/app/journal";
}

interface DexterInsight {
  insight: string;
  context: string;
  mood: Mood;
  cta?: { label: string; href: string };
  generatedAt: string;
}

type DexterResponse = DexterInsight & { cacheHit: boolean };

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

function todayKey(userId: string): string {
  const yyyyMmDd = new Date().toISOString().slice(0, 10);
  return `dexter:today:${userId}:${yyyyMmDd}`;
}

function detectLocale(req: NextRequest, profileLocale: string | null): "pt" | "en" {
  if (profileLocale?.toLowerCase().startsWith("pt")) return "pt";
  if (profileLocale?.toLowerCase().startsWith("en")) return "en";
  const accept = req.headers.get("accept-language")?.toLowerCase() ?? "";
  if (accept.startsWith("en")) return "en";
  return "pt";
}

function buildSystemPrompt(locale: "pt" | "en"): string {
  const langLine =
    locale === "en"
      ? "Respond in English."
      : "Responda em português brasileiro.";

  return `You are Dexter, a senior trading analyst. You've seen this pattern 100 times.
${langLine}

Voice:
- Direct, concise, actionable. Never generic.
- Tone of a senior analyst who respects the reader's time.
- No hedging, no "it depends", no motivational fluff.

Output a STRICT JSON object with this exact shape, and nothing else (no markdown, no prose around it):
{
  "insight": "1 to 2 sentences — the single thing that matters today",
  "context": "1 short sentence explaining why it matters",
  "mood": "default" | "thinking" | "alert" | "celebrating",
  "cta": { "label": "...", "href": "/app/..." } (optional; include only if there's a clear next action in-app)
}

Rules:
- Pick mood by state: "alert" on tilt/drawdown/loss streak; "celebrating" on clean win streak or milestone; "thinking" on ambiguous data; "default" otherwise.
- If the user has no trades yet, guide them to connect MT5 (cta.href = "/app/settings").
- Never fabricate numbers. If data is missing, make the insight about process, not P&L.
- Keep "insight" under 180 characters. Keep "context" under 120 characters.
- cta.href MUST be one of these exact values, no other paths allowed: "/app/journal", "/app/macro", "/app/dexter", "/app/prop", "/app/reports", "/app/backtest", "/app/chart", "/app/mentor", "/app/news", "/app/account", "/app/settings", "/app/pricing". When in doubt, use "/app/journal".`;
}

interface TraderSnapshot {
  plan: Plan;
  weekdayPt: string;
  hourLocal: number;
  tradesCount: number;
  last5: Array<{ symbol: string | null; pnl: number; closed_at: string | null }>;
  currentStreak: { type: "W" | "L" | null; count: number };
  // TODO(c-03): awaiting schema — tilt_score table not present yet.
  tiltScore: number | null;
  // TODO(c-03): awaiting schema — macro_events not present as active table; economic_events is the closest equivalent.
  macroNext8h: Array<{ title: string; country: string; time: string }>;
}

function buildUserPrompt(snap: TraderSnapshot, locale: "pt" | "en"): string {
  const header =
    locale === "en"
      ? "Trader state right now:"
      : "Estado do trader agora:";

  const lines: string[] = [header];
  lines.push(`- plan: ${snap.plan}`);
  lines.push(`- weekday: ${snap.weekdayPt}, hour_local: ${snap.hourLocal}h`);
  lines.push(`- trades_total: ${snap.tradesCount}`);
  lines.push(
    `- current_streak: ${snap.currentStreak.count}${snap.currentStreak.type ?? "-"}`
  );
  if (snap.tiltScore !== null) {
    lines.push(`- tilt_score: ${snap.tiltScore}`);
  }
  if (snap.last5.length > 0) {
    const formatted = snap.last5
      .map((t) => `${t.symbol ?? "?"}:${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}`)
      .join(", ");
    lines.push(`- last_5_trades: ${formatted}`);
  } else {
    lines.push(`- last_5_trades: none`);
  }
  if (snap.macroNext8h.length > 0) {
    lines.push(
      `- macro_next_8h: ${snap.macroNext8h
        .map((e) => `${e.country} ${e.title} @${e.time}`)
        .join("; ")}`
    );
  } else {
    lines.push(`- macro_next_8h: none`);
  }
  return lines.join("\n");
}

function parseModelJson(raw: string): Omit<DexterInsight, "generatedAt"> | null {
  // Strip accidental fences if the model wraps in ```json
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  try {
    const parsed = JSON.parse(cleaned) as {
      insight?: unknown;
      context?: unknown;
      mood?: unknown;
      cta?: unknown;
    };
    if (typeof parsed.insight !== "string" || typeof parsed.context !== "string") return null;
    const mood: Mood =
      parsed.mood === "thinking" ||
      parsed.mood === "alert" ||
      parsed.mood === "celebrating"
        ? parsed.mood
        : "default";
    let cta: DexterInsight["cta"] | undefined;
    if (
      parsed.cta &&
      typeof parsed.cta === "object" &&
      "label" in parsed.cta &&
      "href" in parsed.cta &&
      typeof (parsed.cta as { label: unknown }).label === "string" &&
      typeof (parsed.cta as { href: unknown }).href === "string"
    ) {
      cta = {
        label: (parsed.cta as { label: string }).label,
        href: normalizeCtaHref((parsed.cta as { href: string }).href),
      };
    }
    return { insight: parsed.insight, context: parsed.context, mood, cta };
  } catch {
    return null;
  }
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

  // Plan lookup (server-side mirror of SubscriptionContext coercion)
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();
  const rawPlan = (sub?.plan as Plan | undefined) ?? "free";
  const active = sub?.status === "active" || sub?.status === "trialing";
  const plan: Plan = active ? rawPlan : "free";

  // Cache hit?
  const key = todayKey(userId);
  const cached = (await redis.get(key)) as DexterInsight | null;
  if (cached && typeof cached === "object" && typeof cached.insight === "string") {
    const cta = cached.cta
      ? { label: cached.cta.label, href: normalizeCtaHref(cached.cta.href) }
      : undefined;
    const payload: DexterResponse = { ...cached, cta, cacheHit: true };
    return Response.json(payload);
  }

  // Locale: profiles.locale if column exists, else Accept-Language, else PT.
  let profileLocale: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("locale")
      .eq("user_id", userId)
      .maybeSingle();
    profileLocale = (profile as { locale?: string | null } | null)?.locale ?? null;
  } catch {
    // Column may not exist yet — silent fallback.
  }
  const locale = detectLocale(req, profileLocale);

  // Trader snapshot: last 5 trades + total + simple streak.
  let last5: TraderSnapshot["last5"] = [];
  let tradesCount = 0;
  let currentStreak: TraderSnapshot["currentStreak"] = { type: null, count: 0 };
  try {
    const { data: recent } = await supabase
      .from("journal_trades")
      .select("symbol, net_pnl_usd, pnl_usd, closed_at")
      .eq("user_id", userId)
      .order("closed_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (recent && recent.length > 0) {
      tradesCount = recent.length;
      last5 = recent.slice(0, 5).map((t: { symbol: string | null; net_pnl_usd: number | null; pnl_usd: number | null; closed_at: string | null }) => ({
        symbol: t.symbol,
        pnl: t.net_pnl_usd ?? t.pnl_usd ?? 0,
        closed_at: t.closed_at,
      }));

      const type0: "W" | "L" = (last5[0]?.pnl ?? 0) >= 0 ? "W" : "L";
      let count = 0;
      for (const r of recent as Array<{ net_pnl_usd: number | null; pnl_usd: number | null }>) {
        const pnl = r.net_pnl_usd ?? r.pnl_usd ?? 0;
        const t: "W" | "L" = pnl >= 0 ? "W" : "L";
        if (t === type0) count++;
        else break;
      }
      currentStreak = { type: type0, count };
    }
  } catch (err) {
    console.warn("[dexter/today] trades fetch error:", err);
  }

  const now = new Date();
  const weekdayPt = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const snapshot: TraderSnapshot = {
    plan,
    weekdayPt,
    hourLocal: now.getHours(),
    tradesCount,
    last5,
    currentStreak,
    tiltScore: null,
    macroNext8h: [],
  };

  // Generate via Anthropic.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { ok: false, error: "dexter_offline" },
      { status: 503 }
    );
  }

  let modelJson: Omit<DexterInsight, "generatedAt"> | null = null;
  try {
    const response = await getAnthropic().messages.create({
      model: DEXTER_MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(locale),
      messages: [{ role: "user", content: buildUserPrompt(snapshot, locale) }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    modelJson = parseModelJson(raw);
  } catch (err) {
    console.warn("[dexter/today] Anthropic error:", err);
    return Response.json(
      { ok: false, error: "dexter_offline" },
      { status: 503 }
    );
  }

  if (!modelJson) {
    return Response.json(
      { ok: false, error: "dexter_offline" },
      { status: 503 }
    );
  }

  const insight: DexterInsight = {
    ...modelJson,
    generatedAt: new Date().toISOString(),
  };

  // Write cache with per-plan TTL.
  try {
    await redis.set(key, insight, { ex: TTL_SECONDS[plan] });
  } catch (err) {
    console.warn("[dexter/today] cache write error:", err);
  }

  const payload: DexterResponse = { ...insight, cacheHit: false };
  return Response.json(payload);
}
