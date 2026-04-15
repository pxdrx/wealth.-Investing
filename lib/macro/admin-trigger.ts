// lib/macro/admin-trigger.ts
// Shared helper that lets an admin JWT trigger cron-protected endpoints.
import type { NextRequest } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (!token || token === cronSecret) return false;
  try {
    const sb = createSupabaseClientForUser(token);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return false;
    return await isAdmin(sb, user.id);
  } catch {
    return false;
  }
}
