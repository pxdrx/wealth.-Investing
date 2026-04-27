// Resend webhook receiver. Verifies Svix signature, persists event,
// and auto-disables briefing/recap flags on hard-bounce or complaint.
//
// Configure in Resend dashboard:
//   Webhook URL: https://owealthinvesting.com/api/email/webhook/resend
//   Events: email.sent, email.delivered, email.opened, email.clicked,
//           email.bounced, email.complained, email.delivery_delayed
// Then copy the signing secret to RESEND_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    bounce?: { type?: "hard" | "soft" | string };
  };
}

function asString(v: string | string[] | undefined): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0]?.toLowerCase() ?? null;
  return v.toLowerCase();
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "secret_missing" }, { status: 503 });
  }

  const raw = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: ResendEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(raw, headers) as ResendEvent;
  } catch (err) {
    console.warn("[resend webhook] signature verify failed:", err);
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const sb = createServiceRoleClient();
  const resendId = event.data?.email_id ?? "";
  const toEmail = asString(event.data?.to);
  const bounceType = event.data?.bounce?.type ?? null;

  await sb.from("email_events").insert({
    resend_id: resendId,
    event_type: event.type,
    to_email: toEmail,
    bounce_type: bounceType,
    payload: event,
  });

  // Auto-mute on hard bounce or complaint.
  const shouldMute =
    (event.type === "email.bounced" && bounceType === "hard") ||
    event.type === "email.complained";

  if (shouldMute && toEmail) {
    // Disable both briefing + recap on the user's profile if we can resolve them.
    const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000, page: 1 });
    const match = usersPage?.users.find((u) => u.email?.toLowerCase() === toEmail);
    if (match) {
      await sb
        .from("profiles")
        .update({ briefing_enabled: false, recap_enabled: false, marketing_enabled: false })
        .eq("id", match.id);
    }
    // Also drop into email_opt_outs so future sends are blocked at the consent gate.
    await sb.from("email_opt_outs").upsert(
      {
        email: toEmail,
        user_id: match?.id ?? null,
        source: event.type === "email.complained" ? "complaint" : "hard-bounce",
        opted_out_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
  }

  return NextResponse.json({ ok: true });
}
