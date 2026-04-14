// lib/macro/cron-auth.ts
import { NextRequest } from "next/server";
import crypto from "crypto";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; reason: "missing_secret" | "invalid_auth" };

export function verifyCronAuthDetailed(req: NextRequest): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET not configured");
    return { ok: false, reason: "missing_secret" };
  }

  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${cronSecret}`;

  if (!authHeader || authHeader.length !== expected.length) {
    return { ok: false, reason: "invalid_auth" };
  }

  const match = crypto.timingSafeEqual(
    Buffer.from(authHeader),
    Buffer.from(expected),
  );
  return match ? { ok: true } : { ok: false, reason: "invalid_auth" };
}

export function verifyCronAuth(req: NextRequest): boolean {
  return verifyCronAuthDetailed(req).ok;
}
