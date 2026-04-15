import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not configured");
    return null;
  }
  _resend = new Resend(key);
  return _resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  headers?: Record<string, string>;
  replyTo?: string;
  listId?: string;
}

// Fallback plain-text when caller doesn't supply one. Gmail/Outlook penalize
// HTML-only emails — even a rough text part lifts inbox placement.
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const DEFAULT_UNSUB_MAILTO = "mailto:unsubscribe@owealthinvesting.com";

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  headers,
  replyTo,
  listId,
}: SendEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  // RFC 8058 one-click unsubscribe (Gmail bulk-sender guidelines 2024+):
  // List-Unsubscribe must be present; List-Unsubscribe-Post opts into one-click.
  // Until we ship /api/unsubscribe, mailto fallback keeps reputation healthy.
  const finalHeaders: Record<string, string> = {
    "List-Unsubscribe": `<${DEFAULT_UNSUB_MAILTO}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    ...(listId ? { "List-Id": listId } : {}),
    ...(headers ?? {}),
  };

  try {
    await resend.emails.send({
      from: from ?? "wealth.Investing <noreply@owealthinvesting.com>",
      to,
      subject,
      html,
      text: text ?? htmlToText(html),
      replyTo: replyTo ?? "contato@owealthinvesting.com",
      headers: finalHeaders,
    });
    return true;
  } catch (err) {
    console.error("[email] Send error:", err);
    return false;
  }
}
