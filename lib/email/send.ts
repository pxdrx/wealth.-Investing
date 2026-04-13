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
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    await resend.emails.send({
      from: from ?? "wealth.Investing <noreply@owealthinvesting.com>",
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] Send error:", err);
    return false;
  }
}
