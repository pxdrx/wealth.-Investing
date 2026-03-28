import { NextRequest } from "next/server";
import { generateAnalysis } from "@/lib/analyst/agent/analyst";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
    });
  }

  let body: { ticker?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid request body" }),
      { status: 400 }
    );
  }

  const { ticker } = body;
  if (!ticker || typeof ticker !== "string") {
    return new Response(
      JSON.stringify({ ok: false, error: "Ticker required" }),
      { status: 400 }
    );
  }

  const sanitized = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!sanitized || sanitized.length > 12) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid ticker" }),
      { status: 400 }
    );
  }

  // SEC-015: Verify user has pro subscription
  const supabaseAuth = createSupabaseClientForUser(token);
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser();
  if (!authUser) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid token" }),
      { status: 401 }
    );
  }

  const { data: subscription } = await supabaseAuth
    .from("subscriptions")
    .select("tier")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (!subscription || subscription.tier !== "pro") {
    return new Response(
      JSON.stringify({ ok: false, error: "Pro subscription required" }),
      { status: 403 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const report = await generateAnalysis(sanitized, (event) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        });

        // Persist report to analyst_reports table (service role bypasses RLS)
        let savedId: string | null = null;
        try {
          const supabaseUser = createSupabaseClientForUser(token);
          const { data: { user } } = await supabaseUser.auth.getUser();
          if (user) {
            const { requireEnv } = await import("@/lib/env");
            const supabaseService = createClient(
              requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
              requireEnv("SUPABASE_SERVICE_ROLE_KEY")
            );
            console.log("[analyst/run] Saving report for user:", user.id, "ticker:", report.ticker);
            const { data: inserted, error: insertError } = await supabaseService
              .from("analyst_reports")
              .insert({
                user_id: user.id,
                ticker: report.ticker,
                asset_type: report.assetType,
                report: report,
              })
              .select("id")
              .maybeSingle();
            if (insertError) {
              console.error("[analyst/run] Insert error:", insertError.message);
            } else {
              console.log("[analyst/run] Report saved with id:", inserted?.id);
            }
            savedId = inserted?.id ?? null;
          }
        } catch (persistErr) {
          console.error("[analyst/run] Persist failed:", persistErr);
          // Non-critical — report still delivered via SSE
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "report", data: JSON.stringify(report), savedId })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("[analyst/run] SSE error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", data: "Analysis failed. Please try again." })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
