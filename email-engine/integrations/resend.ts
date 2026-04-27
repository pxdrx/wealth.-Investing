// Track B Resend wrapper.
// Thin layer over lib/email/send.ts that takes a TemplateId + props,
// renders via the mock factory (Track A swap-point), and dispatches.
//
// Future: when scheduledFor is set, delegate to schedulers/queue.ts.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { sendEmail, type SendEmailAttachment } from "@/lib/email/send";
import { renderTemplate } from "../render";
import { MASCOT_CID } from "@/email/templates/DailyBriefing";
import type { TemplateId, TemplatePropsMap } from "../__mocks__/types";

// Cache the mascot PNG bytes once per process so high-fan-out cron
// runs don't re-read the file on every send.
let _mascotBuf: Buffer | null = null;
async function loadMascot(): Promise<Buffer> {
  if (_mascotBuf) return _mascotBuf;
  const p = path.join(process.cwd(), "public", "email-assets", "dexter-64.png");
  _mascotBuf = await readFile(p);
  return _mascotBuf;
}

async function attachmentsFor(
  template: TemplateId,
): Promise<SendEmailAttachment[] | undefined> {
  if (template === "daily-briefing" || template === "weekly-recap" || template.startsWith("welcome.") || template.startsWith("upgrade.")) {
    try {
      const content = await loadMascot();
      return [
        {
          filename: "dexter.png",
          content,
          contentType: "image/png",
          contentId: MASCOT_CID,
        },
      ];
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export interface SendArgs<T extends TemplateId> {
  template: T;
  props: TemplatePropsMap[T];
  to: string;
  scheduledFor?: Date;
  listId?: string;
}

export interface SendResult {
  ok: boolean;
  templateId: TemplateId;
  scheduled: boolean;
  error?: string;
}

const FROM = process.env.EMAIL_FROM ?? "wealth.Investing <briefing@owealthinvesting.com>";

export async function send<T extends TemplateId>(args: SendArgs<T>): Promise<SendResult> {
  if (args.scheduledFor && args.scheduledFor.getTime() > Date.now() + 60_000) {
    // Future-dated: enqueue via schedulers/queue.ts (Task 02 implements).
    try {
      const { enqueue } = await import("../schedulers/queue");
      await enqueue({
        template: args.template,
        props: args.props,
        to: args.to,
        sendAt: args.scheduledFor,
      });
      return { ok: true, templateId: args.template, scheduled: true };
    } catch (err) {
      return {
        ok: false,
        templateId: args.template,
        scheduled: false,
        error: `enqueue failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const rendered = await renderTemplate(args.template, args.props);

  // unsubscribeUrl lives on rendered props, but lib/email/send.ts also wants it.
  // Most templates carry it on props.unsubscribeUrl; pass through when present.
  const propsAny = args.props as { unsubscribeUrl?: string };
  const unsubscribeUrl = propsAny.unsubscribeUrl;

  const attachments = await attachmentsFor(args.template);

  const ok = await sendEmail({
    to: args.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    from: FROM,
    listId: args.listId ?? `wealth-investing-${args.template}`,
    unsubscribeUrl,
    attachments,
  });

  return { ok, templateId: args.template, scheduled: false };
}
