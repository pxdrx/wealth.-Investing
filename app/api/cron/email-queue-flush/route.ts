// Drains pending scheduled_emails rows whose send_at <= now().
// Runs every 5 min via Vercel Cron. Used by Welcome (D1-7), Upgrade
// (D7, D14), and Churn (D14) sequences.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/macro/cron-auth";
import { acquireCronLock } from "@/lib/cron-lock";
import { flushDue } from "@/email-engine/schedulers/queue";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!(await acquireCronLock("email-queue-flush"))) {
    return NextResponse.json({ ok: true, skipped: "lock_held" });
  }

  try {
    const result = await flushDue();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[email-queue-flush] failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
