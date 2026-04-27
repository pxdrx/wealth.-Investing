// Standalone double opt-in flow. Sends an opt-in-confirm email with a
// signed URL; clicking lands on /api/email/consent/confirm which writes
// email_consents. Used for public newsletter forms (future) where we
// need explicit consent vs the implicit consent from Supabase auth's
// email-verification flow.

import { send } from "../integrations/resend";
import { canSend } from "../lib/consent";
import { buildConsentConfirmUrl } from "../lib/consentToken";
import type { Locale } from "../__mocks__/types";

export interface SendOptInArgs {
  email: string;
  firstName: string;
  locale?: Locale;
  channel?: string;
}

export interface SendOptInResult {
  ok: boolean;
  reason?: string;
}

export async function sendOptInConfirmation(
  args: SendOptInArgs,
): Promise<SendOptInResult> {
  const channel = args.channel ?? "all";
  const consent = await canSend(args.email, "transactional");
  if (!consent.allowed) return { ok: false, reason: consent.reason };

  const confirmUrl = buildConsentConfirmUrl(args.email, channel);

  const r = await send({
    template: "opt-in-confirm",
    props: {
      firstName: args.firstName,
      locale: args.locale ?? "pt-BR",
      confirmUrl,
    },
    to: args.email,
  });

  return { ok: r.ok, reason: r.error };
}
