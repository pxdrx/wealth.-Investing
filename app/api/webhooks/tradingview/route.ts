import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[webhook] WEBHOOK_SECRET not configured");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const secret = req.headers.get("x-webhook-secret");
    if (!secret || !timingSafeCompare(secret, webhookSecret)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = await req.text();

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(body);
    } catch {
      payload = { message: body };
    }

    // Use configured owner user ID directly instead of enumerating users
    const ownerId = process.env.WEBHOOK_OWNER_USER_ID;
    if (!ownerId) {
      console.error("[webhook] WEBHOOK_OWNER_USER_ID not configured");
      return NextResponse.json({ ok: false, error: "Webhook not configured" }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[webhook] Supabase config missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    // Use service_role key to bypass RLS — this is a server-side webhook route
    // already validated by timing-safe secret comparison above
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase.from("tv_alerts").insert({
      user_id: ownerId,
      symbol: (payload.symbol as string) || "UNKNOWN",
      alert_type: (payload.alert_type as string) || "manual",
      timeframe: (payload.timeframe as string) || null,
      message: (payload.message as string) || body,
      payload,
    });

    if (error) {
      console.error("[webhook] Insert error:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Unexpected error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
