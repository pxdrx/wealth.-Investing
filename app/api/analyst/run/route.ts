import { NextRequest } from "next/server";
import { generateAnalysis } from "@/lib/analyst/agent/analyst";

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const report = await generateAnalysis(sanitized, (event) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "report", data: JSON.stringify(report) })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", data: String(err) })}\n\n`
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
