// Pre-send consent gate.
// Honors the existing email_opt_outs table (RFC 8058 one-click sink) and
// future per-channel opt-in flags (Task 07: email_consents).

import { createServiceRoleClient } from "@/lib/supabase/service";

export type EmailChannel =
  | "welcome"
  | "daily-briefing"
  | "weekly-recap"
  | "upgrade"
  | "churn"
  | "transactional";

export interface ConsentResult {
  allowed: boolean;
  reason?: string;
}

export async function canSend(email: string, _channel: EmailChannel): Promise<ConsentResult> {
  if (!email) return { allowed: false, reason: "no email" };
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("email_opt_outs")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) {
    // Fail-open for transient DB errors — better to send than to silently drop.
    // Logged via console for ops visibility.
    console.warn("[consent] opt_outs lookup failed:", error.message);
    return { allowed: true };
  }
  if (data) return { allowed: false, reason: "opted_out" };
  return { allowed: true };
}
