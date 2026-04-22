/**
 * POST /api/ai/companion — SSE streaming chat for the Dexter Companion tab.
 *
 * Body:
 *   { conversationId?: string; message: string; accountId: string | null }
 *
 * Response: text/event-stream
 *   data: {"text":"..."}\n\n            (many, one per token chunk)
 *   data: {"error":"..."}\n\n          (on failure, terminal)
 *   data: [DONE]\n\n                    (on success, terminal)
 *
 * Tier gate: Pro / Ultra only. Free → 402.
 * Rate limit: 30 messages per hour per user.
 * Persistence: user + assistant rows written to ai_coach_messages with
 *              source='companion' after the stream finishes.
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
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 4000;

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

interface CompanionRequestBody {
  conversationId?: string;
  message: string;
  accountId: string | null;
}

function isCompanionBody(x: unknown): x is CompanionRequestBody {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.message !== "string") return false;
  if (o.accountId !== null && typeof o.accountId !== "string") return false;
  if (o.conversationId !== undefined && typeof o.conversationId !== "string") return false;
  return true;
}

export async function POST(req: NextRequest) {
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

  // 2. Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (!isCompanionBody(body)) {
    return NextResponse.json({ ok: false, error: "invalid_body_shape" }, { status: 400 });
  }
  const { message, accountId } = body;
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return NextResponse.json({ ok: false, error: "empty_message" }, { status: 400 });
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: "message_too_long" }, { status: 400 });
  }
  if (accountId !== null && !UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "invalid_account_id" }, { status: 400 });
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

  // 4. Rate limit
  const rl = await companionRateLimit.limit(userId);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "X-RateLimit-Remaining": String(rl.remaining) } },
    );
  }

  // 5. Assemble context (best-effort)
  const { ctx, account } = await assembleCompanionContext(
    supabase,
    userId,
    accountId,
  );
  if (accountId !== null && !account) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const system = buildCompanionSystem(ctx);
  const encoder = new TextEncoder();

  // 6. Stream Anthropic
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      let closed = false;
      const safeClose = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
        }
      };

      try {
        const messageStream = getAnthropic().messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 700,
          system: [
            {
              type: "text",
              text: system,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: trimmed }],
        });

        for await (const event of messageStream) {
          if (event.type === "content_block_delta" && "delta" in event) {
            const delta = event.delta as { type: string; text?: string };
            if (delta.type === "text_delta" && delta.text) {
              assistantText += delta.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`),
              );
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: unknown) {
        console.error("[ai-companion] anthropic stream error:", err);
        const apiError = err as { status?: number; message?: string };
        let errorMessage = "Erro ao processar. Tente novamente.";
        if (
          apiError.status === 402 ||
          (apiError.message && /credit|billing|payment|insufficient_funds/i.test(apiError.message))
        ) {
          errorMessage = "Dexter Companion indisponível: créditos API esgotados.";
        } else if (
          apiError.status === 429 ||
          (apiError.message && /rate.limit/i.test(apiError.message))
        ) {
          errorMessage = "Muitas requisições ao modelo. Aguarde um momento.";
        } else if (apiError.status === 401 || apiError.status === 403) {
          errorMessage = "Erro de configuração da API.";
        }
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`),
          );
        } catch {}
      } finally {
        // Persist user + assistant exchange regardless of success, as long as
        // something was produced. Failures here are logged but never break
        // the SSE contract — the client already received [DONE] or error.
        if (trimmed.length > 0) {
          try {
            const rows: Array<{
              user_id: string;
              role: "user" | "assistant";
              content: string;
              source: "companion";
            }> = [
              { user_id: userId, role: "user", content: trimmed, source: "companion" },
            ];
            if (assistantText.trim().length > 0) {
              rows.push({
                user_id: userId,
                role: "assistant",
                content: assistantText,
                source: "companion",
              });
            }
            const { error: insertError } = await supabase
              .from("ai_coach_messages")
              .insert(rows);
            if (insertError) {
              console.warn("[ai-companion] persist error:", insertError.message);
            }
          } catch (persistErr) {
            console.warn("[ai-companion] persist exception:", persistErr);
          }
        }
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
