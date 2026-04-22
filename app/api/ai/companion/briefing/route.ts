/**
 * GET /api/ai/companion/briefing?accountId=<uuid>
 *
 * One-shot briefing for the Dexter Companion tab. Called once per UTC day per
 * account when the user opens /app/dexter/chat. Returns a short summary + 2-3
 * quick-reply suggestions crafted by Claude Haiku from the live account +
 * macro context.
 *
 * Contract (frontend relies on these exact keys):
 *   { ok: true, summary: string, quickReplies: string[], context: {
 *       accountName, todayPnlUsd, todayTradeCount, openPositionsCount,
 *       nextEvent: { title, whenRelative } | null
 *   } }
 *
 * Tier gate: Pro and Ultra only. Free returns 402.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { companionRateLimit } from "@/lib/rate-limit";
import { assembleCompanionContext } from "@/lib/ai/companionContext";
import { buildCompanionSystem } from "@/lib/ai/companionPrompt";
import type { Plan } from "@/lib/subscription-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

interface BriefingJson {
  summary: string;
  quickReplies: string[];
}

function isBriefingJson(x: unknown): x is BriefingJson {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.summary !== "string") return false;
  if (!Array.isArray(o.quickReplies)) return false;
  return o.quickReplies.every((q) => typeof q === "string");
}

export async function GET(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseClientForUser(token);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "invalid_session" }, { status: 401 });
  }
  const userId = user.id;

  // 2. Validate account
  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId || !UUID_RE.test(accountId)) {
    return NextResponse.json(
      { ok: false, error: "accountId_required" },
      { status: 400 },
    );
  }

  // 3. Tier check — Pro / Ultra only
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan: Plan = ((sub as { plan?: Plan } | null)?.plan ?? "free") as Plan;
  if (plan === "free") {
    return NextResponse.json(
      { ok: false, error: "upgrade_required", plan },
      { status: 402 },
    );
  }

  // 4. Rate limit (shared with chat stream)
  const rl = await companionRateLimit.limit(userId);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "X-RateLimit-Remaining": String(rl.remaining) } },
    );
  }

  // 5. Assemble context
  const { ctx, account } = await assembleCompanionContext(supabase, userId, accountId);
  if (!account) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // 6. Ask Haiku for JSON briefing (non-streaming)
  const system = buildCompanionSystem(ctx);
  const userPrompt = `Produza um briefing CURTO de abertura de sessão. Responda SOMENTE com JSON válido, sem markdown, no formato exato:
{
  "summary": "1–2 frases no tom Ticker olhando o contexto atual. PT-BR. Sem emojis.",
  "quickReplies": ["3 sugestões de próxima mensagem curtas (máx 40 chars cada), em 1ª pessoa do usuário falando com Ticker, referenciando contexto real quando possível"]
}`;

  let summary = "Pronto pra destravar sua sessão. O que tá na sua cabeça?";
  let quickReplies: string[] = [
    "Como tá meu dia?",
    "O que monitorar agora?",
    "Analisar um ativo",
  ];

  try {
    const resp = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });
    const first = resp.content[0];
    if (first && first.type === "text") {
      // Strip possible ```json fences defensively.
      const raw = first.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isBriefingJson(parsed)) {
          summary = parsed.summary.slice(0, 400);
          quickReplies = parsed.quickReplies
            .slice(0, 3)
            .map((q) => q.slice(0, 60));
        }
      } catch {
        // Fall back to defaults — never 500 on parse error.
      }
    }
  } catch (err) {
    console.warn("[companion/briefing] anthropic error:", err);
    // Fall through with defaults.
  }

  return NextResponse.json({
    ok: true,
    summary,
    quickReplies,
    context: {
      accountName: ctx.accountName,
      todayPnlUsd: ctx.todayPnlUsd,
      todayTradeCount: ctx.todayTradeCount,
      openPositionsCount: ctx.openPositions.length,
      nextEvent: ctx.nextEvent
        ? { title: ctx.nextEvent.title, whenRelative: ctx.nextEvent.whenRelative }
        : null,
    },
  });
}
