// lib/macro/cron-auth.ts
import { NextRequest } from "next/server";

/**
 * Verify cron requests come from Vercel or have the correct secret.
 * In production, Vercel sets the Authorization header automatically.
 * For manual triggers, check CRON_SECRET.
 */
export function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET not configured");
    return false;
  }

  // Vercel Cron sets Authorization header with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}
