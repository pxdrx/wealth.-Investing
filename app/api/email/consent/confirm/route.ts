// GET /api/email/consent/confirm?token=...
// Verifies signed (email, channel) token, INSERTs email_consents, returns
// HTML success page. No login required (RFC 8058-style 1-click confirm).

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { verifyConsentToken } from "@/email-engine/lib/consentToken";

export const runtime = "nodejs";

function landingPage(email: string, channel: string, ok: boolean): string {
  const safeEmail = email.replace(/[<>&"']/g, "");
  const safeChannel = channel.replace(/[<>&"']/g, "");
  const message = ok
    ? `Inscrição confirmada para <code>${safeEmail}</code> (canal <code>${safeChannel}</code>).`
    : `Não foi possível confirmar agora. Tente novamente.`;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmação · wealth.Investing</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#111;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{max-width:440px;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);text-align:center}
h1{margin:0 0 8px;font-size:20px}
p{margin:0 0 16px;font-size:14px;color:#555;line-height:1.5}
code{background:#f5f5f7;padding:2px 6px;border-radius:6px;font-size:13px}
a{color:#2563eb;text-decoration:none;font-weight:600}
</style></head><body><div class="card">
<h1>${ok ? "Confirmado" : "Erro"}</h1>
<p>${message}</p>
<p><a href="https://owealthinvesting.com/app">Acessar painel</a></p>
</div></body></html>`;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse(landingPage("", "", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const payload = verifyConsentToken(token);
  if (!payload) {
    return new NextResponse(landingPage("", "", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const sb = createServiceRoleClient();

  // Best-effort user_id lookup. user_id is nullable in email_consents.
  const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000, page: 1 });
  const match = usersPage?.users.find(
    (u) => u.email?.toLowerCase() === payload.email,
  );

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const { error } = await sb.from("email_consents").upsert(
    {
      user_id: match?.id ?? null,
      email: payload.email,
      channel: payload.channel,
      granted_via: "double-opt-in",
      ip,
      user_agent: userAgent,
      granted_at: new Date().toISOString(),
    },
    { onConflict: "email,channel", ignoreDuplicates: false },
  );

  if (error) {
    console.error("[consent/confirm] insert failed:", error.message);
    return new NextResponse(landingPage(payload.email, payload.channel, false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(landingPage(payload.email, payload.channel, true), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
