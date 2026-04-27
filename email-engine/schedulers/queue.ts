// Persistent email queue backed by scheduled_emails table.
// Idempotent enqueue via UNIQUE (user_id, template).

import { createServiceRoleClient } from "@/lib/supabase/service";
import { send } from "../integrations/resend";
import { canSend, type EmailChannel } from "../lib/consent";
import type { TemplateId, TemplatePropsMap } from "../__mocks__/types";

export interface EnqueueArgs<T extends TemplateId = TemplateId> {
  template: T;
  props: TemplatePropsMap[T];
  to: string;
  sendAt: Date;
  userId?: string;
}

export interface EnqueueResult {
  ok: boolean;
  inserted: boolean;
  scheduledId?: string;
  reason?: string;
}

export async function enqueue<T extends TemplateId>(
  args: EnqueueArgs<T>,
): Promise<EnqueueResult> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("scheduled_emails")
    .upsert(
      {
        user_id: args.userId ?? null,
        template: args.template,
        props: args.props,
        to_email: args.to.toLowerCase(),
        send_at: args.sendAt.toISOString(),
        status: "pending",
      },
      { onConflict: "user_id,template", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, inserted: false, reason: error.message };
  }
  return { ok: true, inserted: !!data, scheduledId: data?.id };
}

interface DueRow {
  id: string;
  user_id: string | null;
  template: TemplateId;
  props: TemplatePropsMap[TemplateId];
  to_email: string;
  attempts: number;
}

const MAX_ATTEMPTS = 5;
const FLUSH_LIMIT = 200;

export interface FlushResult {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
}

// Channel inference from template id — used for consent check during flush.
function templateChannel(template: TemplateId): EmailChannel {
  if (template.startsWith("welcome")) return "welcome";
  if (template === "daily-briefing") return "daily-briefing";
  if (template === "weekly-recap") return "weekly-recap";
  if (template.startsWith("upgrade")) return "upgrade";
  if (template.startsWith("churn")) return "churn";
  return "transactional";
}

export async function flushDue(now: Date = new Date()): Promise<FlushResult> {
  const sb = createServiceRoleClient();
  const { data: rows, error } = await sb
    .from("scheduled_emails")
    .select("id,user_id,template,props,to_email,attempts")
    .eq("status", "pending")
    .lte("send_at", now.toISOString())
    .lt("attempts", MAX_ATTEMPTS)
    .order("send_at", { ascending: true })
    .limit(FLUSH_LIMIT);

  if (error) throw new Error(`flush query failed: ${error.message}`);

  const result: FlushResult = { attempted: 0, sent: 0, skipped: 0, failed: 0 };
  if (!rows || rows.length === 0) return result;

  for (const row of rows as DueRow[]) {
    result.attempted++;

    // Consent re-check at send time — opt-out may have happened between enqueue and flush.
    const consent = await canSend(row.to_email, templateChannel(row.template));
    if (!consent.allowed) {
      await sb
        .from("scheduled_emails")
        .update({
          status: "skipped",
          last_error: consent.reason ?? "consent denied",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      result.skipped++;
      continue;
    }

    const sendResult = await send({
      template: row.template,
      props: row.props,
      to: row.to_email,
    });

    if (sendResult.ok) {
      await sb
        .from("scheduled_emails")
        .update({
          status: "sent",
          attempts: row.attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      result.sent++;
    } else {
      const nextAttempts = row.attempts + 1;
      await sb
        .from("scheduled_emails")
        .update({
          status: nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts: nextAttempts,
          last_error: sendResult.error ?? "send failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      result.failed++;
    }
  }

  return result;
}

// Back-compat with Task 01 stub signature.
export async function dequeueDue(now: Date = new Date()): Promise<EnqueueArgs[]> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("scheduled_emails")
    .select("template,props,to_email,send_at,user_id")
    .eq("status", "pending")
    .lte("send_at", now.toISOString())
    .order("send_at", { ascending: true })
    .limit(FLUSH_LIMIT);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    template: r.template as TemplateId,
    props: r.props as TemplatePropsMap[TemplateId],
    to: r.to_email,
    sendAt: new Date(r.send_at),
    userId: r.user_id ?? undefined,
  }));
}
