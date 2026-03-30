import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { validateAccountOwnership } from "@/lib/account-validation";
import { getTierLimits } from "@/lib/subscription-shared";
import type { Plan } from "@/lib/subscription-shared";
import { getPersonalTradeStats } from "@/lib/ai-stats";
import { getCommunityIntelligence } from "@/lib/ai-community-stats";
import { buildSystemPrompt, formatPsychologyProfile } from "@/lib/ai-prompts";
import { computeTradeAnalytics } from "@/lib/trade-analytics";
import type { JournalTradeRow } from "@/components/journal/types";
import { aiCoachRateLimit } from "@/lib/rate-limit";

// Lazy-init to prevent build-time crash if ANTHROPIC_API_KEY is missing
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}


interface CoachRequestBody {
  type: "session" | "weekly" | "chat";
  messages: { role: "user" | "assistant"; content: string }[];
  account_id: string;
  enriched?: boolean;
  conversation_id?: string;
}

const VALID_TYPES = new Set(["session", "weekly", "chat"]);
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_TOTAL_LENGTH = 50000;

export async function POST(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseClientForUser(token);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ ok: false, error: "Sessão inválida" }, { status: 401 });
  }
  const userId = user.id;

  // 2. Parse & validate body
  let body: CoachRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Corpo inválido" }, { status: 400 });
  }

  if (!VALID_TYPES.has(body.type)) {
    return Response.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }
  if (!body.account_id || typeof body.account_id !== "string") {
    return Response.json({ ok: false, error: "account_id obrigatório" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ ok: false, error: "messages obrigatório" }, { status: 400 });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return Response.json({ ok: false, error: "Muitas mensagens" }, { status: 400 });
  }

  let totalLength = 0;
  for (const msg of body.messages) {
    if (typeof msg.content !== "string" || !["user", "assistant"].includes(msg.role)) {
      return Response.json({ ok: false, error: "Formato de mensagem inválido" }, { status: 400 });
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ ok: false, error: "Mensagem muito longa" }, { status: 400 });
    }
    totalLength += msg.content.length;
  }
  if (totalLength > MAX_TOTAL_LENGTH) {
    return Response.json({ ok: false, error: "Conteúdo total muito longo" }, { status: 400 });
  }

  // 3. Burst rate limit (Upstash Redis sliding window)
  const { success: withinBurstLimit, remaining } = await aiCoachRateLimit.limit(userId);
  if (!withinBurstLimit) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded. Please wait before sending another message." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  // 3b. Validate account ownership before any data access or quota increment
  const ownedAccount = await validateAccountOwnership(supabase, body.account_id, userId);
  if (!ownedAccount) {
    return Response.json({ ok: false, error: "Account not found" }, { status: 403 });
  }

  // 4. Check tier quota
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const plan: Plan = (sub?.plan as Plan) ?? "free";
  const isUltraTier = plan === "ultra";
  const limits = getTierLimits(plan);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: usage } = await supabase
    .from("ai_usage")
    .select("usage_count, daily_count, daily_date")
    .eq("user_id", userId)
    .eq("month", currentMonth)
    .maybeSingle();

  const usageCount = (usage as { usage_count?: number } | null)?.usage_count ?? 0;
  const dailyCount = (usage as { daily_count?: number; daily_date?: string } | null)?.daily_count ?? 0;
  const dailyDate = (usage as { daily_date?: string } | null)?.daily_date ?? "";
  const today = new Date().toISOString().slice(0, 10);

  if (usageCount >= limits.aiCoachMonthly) {
    return Response.json({
      ok: false,
      error: "quota_exceeded",
      limit: limits.aiCoachMonthly,
      used: usageCount,
      plan,
    }, { status: 429 });
  }

  if (limits.aiCoachDaily && dailyDate === today && dailyCount >= limits.aiCoachDaily) {
    return Response.json({
      ok: false,
      error: "daily_quota_exceeded",
      dailyLimit: limits.aiCoachDaily,
      dailyUsed: dailyCount,
      plan,
    }, { status: 429 });
  }

  // 5. Optimistic increment (before calling Anthropic)
  const { error: incrError } = await supabase.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_month: currentMonth,
  });
  if (incrError) {
    console.warn("[ai-coach] increment error:", incrError.message);
  }

  // 6. Fetch data sources in parallel
  // Account name already validated in step 3b
  const accountName = ownedAccount.name ?? "Conta";

  let personalStats: Awaited<ReturnType<typeof getPersonalTradeStats>>;
  let communitySentiment: Awaited<ReturnType<typeof getCommunityIntelligence>>;
  let newsHeadlines: string[] = [];

  try {
    [personalStats, communitySentiment] = await Promise.all([
      getPersonalTradeStats(supabase, body.account_id, userId),
      getCommunityIntelligence(),
    ]);
  } catch (err) {
    console.warn("[ai-coach] data fetch error:", err);
    personalStats = null;
    communitySentiment = [];
  }

  // Fetch news headlines (best-effort, don't block on failure)
  try {
    const newsUrl = new URL("/api/news", req.url);
    const newsRes = await fetch(newsUrl.toString());
    if (newsRes.ok) {
      const newsData = await newsRes.json();
      if (Array.isArray(newsData.articles)) {
        newsHeadlines = (newsData.articles as { title?: string }[])
          .slice(0, 5)
          .map((a) => a.title ?? "")
          .filter(Boolean);
      }
    }
  } catch {}

  // Fetch Dexter analyst reports (best-effort)
  let dexterReports = "";
  try {
    const { data: reports } = await supabase
      .from("analyst_reports")
      .select("ticker, asset_type, report, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (reports && reports.length > 0) {
      const summaries = reports.map((r: { ticker: string; asset_type: string; report: { verdict?: { bias?: string; confidence?: string; summary?: string; keyLevels?: string[] } }; created_at: string }) => {
        const v = r.report?.verdict;
        return `- ${r.ticker} (${r.asset_type}, ${new Date(r.created_at).toLocaleDateString("pt-BR")}): ${v?.bias ?? "?"} | Confiança: ${v?.confidence ?? "?"} | ${v?.summary ?? ""} | Níveis: ${v?.keyLevels?.join(", ") ?? "N/A"}`;
      });
      dexterReports = `\n\n## Análises recentes do Analista Dexter:\n${summaries.join("\n")}`;
    }
  } catch {}

  // 6b. If enriched mode, fetch full trade data for analytics + psychology
  let tradeAnalytics: ReturnType<typeof computeTradeAnalytics> | null = null;
  let psychologyProfile: string | null = null;

  if (body.enriched) {
    try {
      const { data: allTrades } = await supabase
        .from("journal_trades")
        .select("id, symbol, direction, opened_at, closed_at, pnl_usd, fees_usd, net_pnl_usd, category, emotion, discipline, setup_quality, custom_tags, entry_rating, exit_rating, management_rating, mfe_usd, mae_usd")
        .eq("user_id", userId)
        .eq("account_id", body.account_id)
        .order("closed_at", { ascending: true });

      if (allTrades && allTrades.length > 0) {
        const trades = allTrades as JournalTradeRow[];
        tradeAnalytics = computeTradeAnalytics(trades);
        psychologyProfile = formatPsychologyProfile(trades);
      }
    } catch (err) {
      console.warn("[ai-coach] enriched data fetch error:", err);
    }
  }

  // 6c. Ultra tier: fetch recent trade summary for enriched system prompt
  let ultraTradeContext = "";
  if (isUltraTier) {
    try {
      const { data: recentTrades } = await supabase
        .from("journal_trades")
        .select("symbol, direction, pnl_usd, net_pnl_usd, closed_at")
        .eq("user_id", userId)
        .eq("account_id", body.account_id)
        .order("closed_at", { ascending: false })
        .limit(30);

      if (recentTrades && recentTrades.length > 0) {
        const wins = recentTrades.filter((t: { net_pnl_usd: number | null; pnl_usd: number }) => (t.net_pnl_usd ?? t.pnl_usd) > 0).length;
        const winRate = ((wins / recentTrades.length) * 100).toFixed(1);
        const totalPnl = recentTrades.reduce((sum: number, t: { net_pnl_usd: number | null; pnl_usd: number }) => sum + (t.net_pnl_usd ?? t.pnl_usd), 0).toFixed(2);

        // Top symbols by frequency
        const symbolCounts: Record<string, number> = {};
        for (const t of recentTrades) {
          symbolCounts[t.symbol] = (symbolCounts[t.symbol] ?? 0) + 1;
        }
        const topSymbols = Object.entries(symbolCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([s]) => s)
          .join(", ");

        ultraTradeContext = `\n\n## Contexto personalizado do trader (Ultra)
- Win rate ultimos 30 trades: ${winRate}%
- P&L total ultimos 30 trades: $${totalPnl}
- Principais ativos: ${topSymbols}
- Total de trades analisados: ${recentTrades.length}
Use esses dados para personalizar profundamente suas respostas.`;
      }
    } catch (err) {
      console.warn("[ai-coach] ultra trade context fetch error:", err);
    }
  }

  // 7. Build system prompt
  const systemPrompt = buildSystemPrompt({
    personalStats,
    newsHeadlines,
    communitySentiment: communitySentiment ?? [],
    analysisType: body.type,
    accountName,
    tradeAnalytics,
    psychologyProfile,
  }) + dexterReports + ultraTradeContext;

  // 8. Stream from Anthropic — model varies by tier
  const aiModel = isUltraTier ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";
  const maxTokens = isUltraTier ? 4096 : 2048;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = getAnthropic().messages.stream({
          model: aiModel,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: body.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        });

        for await (const event of messageStream) {
          if (event.type === "content_block_delta" && "delta" in event) {
            const delta = event.delta as { type: string; text?: string };
            if (delta.type === "text_delta" && delta.text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
              );
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: unknown) {
        console.error("[ai-coach] Anthropic stream error:", err);

        // Rollback usage on failure
        try {
          await supabase.rpc("decrement_ai_usage", {
            p_user_id: userId,
            p_month: currentMonth,
          });
        } catch {}

        // Map Anthropic error codes to user-facing messages
        let errorMessage = "Erro ao processar sua mensagem. Tente novamente.";
        const apiError = err as { status?: number; message?: string };
        if (apiError.status === 402 || (apiError.message && /credit|billing|payment|insufficient_funds/i.test(apiError.message))) {
          errorMessage = "AI Coach indisponivel: creditos API esgotados.";
        } else if (apiError.status === 429 || (apiError.message && /rate.limit/i.test(apiError.message))) {
          errorMessage = "Muitas requisicoes. Aguarde um momento.";
        } else if (apiError.status === 401 || apiError.status === 403) {
          errorMessage = "Erro de configuracao da API.";
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
