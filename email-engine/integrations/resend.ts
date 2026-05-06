// Track B Resend wrapper.
// Thin layer over lib/email/send.ts that takes a TemplateId + props,
// renders via the mock factory (Track A swap-point), and dispatches.
//
// Future: when scheduledFor is set, delegate to schedulers/queue.ts.

import { sendEmail } from "@/lib/email/send";
import { renderTemplate } from "../render";
import type { TemplateId, TemplatePropsMap } from "../__mocks__/types";

export interface SendArgs<T extends TemplateId> {
  template: T;
  props: TemplatePropsMap[T];
  to: string;
  scheduledFor?: Date;
  listId?: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
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

  const r = await sendEmail({
    to: args.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    from: FROM,
    listId: args.listId ?? `wealth-investing-${args.template}`,
    unsubscribeUrl,
  });

  return {
    ok: r.ok,
    id: r.id,
    error: r.error,
    templateId: args.template,
    scheduled: false,
  };
}
