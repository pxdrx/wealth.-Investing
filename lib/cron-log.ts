import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CronStatus = "ok" | "failed" | "skipped";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function logCronRun(
  cronName: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const startedAt = new Date();
  let status: CronStatus = "ok";
  let errorMsg: string | null = null;
  let payload: Record<string, unknown> | null = null;
  let response: NextResponse;

  try {
    response = await handler();
    try {
      payload = await response.clone().json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      status = "failed";
      if (payload && typeof payload.error === "string") errorMsg = payload.error;
    } else if (payload && typeof payload.skipped !== "undefined") {
      status = "skipped";
    }
  } catch (err) {
    status = "failed";
    errorMsg = err instanceof Error ? err.message : String(err);
    response = NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }

  const finishedAt = new Date();
  const sb = getAdminClient();
  if (sb) {
    const sentVal = payload && typeof payload.sent === "number" ? payload.sent : null;
    const matchedVal = payload && typeof payload.matched === "number" ? payload.matched : null;
    await sb
      .from("cron_runs")
      .insert({
        cron_name: cronName,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        status,
        sent: sentVal,
        matched: matchedVal,
        error: errorMsg,
        payload,
      })
      .then(
        () => {},
        (e) => console.warn(`[cron-log] insert failed for ${cronName}:`, e),
      );
  }

  return response;
}
