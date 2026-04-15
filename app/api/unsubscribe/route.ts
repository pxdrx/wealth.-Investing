import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";

export const runtime = "nodejs";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function optOut(email: string, source: string) {
  const sb = getAdmin();
  if (!sb) return { ok: false, error: "supabase_unavailable" as const };

  // Best-effort user_id lookup; null is fine — email is the PK.
  const {
    data: { users },
  } = await sb.auth.admin.listUsers({ perPage: 1000, page: 1 });
  const match = users.find((u) => u.email?.toLowerCase() === email);

  const { error } = await sb
    .from("email_opt_outs")
    .upsert(
      {
        email,
        user_id: match?.id ?? null,
        source,
        opted_out_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function landingPage(email: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cancelado · wealth.Investing</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#111;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{max-width:440px;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);text-align:center}
h1{margin:0 0 8px;font-size:20px}
p{margin:0 0 16px;font-size:14px;color:#555;line-height:1.5}
code{background:#f5f5f7;padding:2px 6px;border-radius:6px;font-size:13px}
a{color:#2563eb;text-decoration:none;font-weight:600}
</style></head><body><div class="card">
<h1>Inscrição cancelada</h1>
<p>O e-mail <code>${email.replace(/[<>&"']/g, "")}</code> não vai mais receber briefings da wealth.Investing.</p>
<p>Mudou de ideia? Reative nas <a href="https://owealthinvesting.com/app/settings">configurações da conta</a>.</p>
</div></body></html>`;
}

// RFC 8058 one-click: Gmail/Outlook POST with any body.
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  const email = verifyUnsubscribeToken(token);
  if (!email) return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  const res = await optOut(email, "one-click");
  if (!res.ok) return NextResponse.json(res, { status: 500 });
  return NextResponse.json({ ok: true });
}

// User-facing click from the email footer.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("missing token", { status: 400 });
  }
  const email = verifyUnsubscribeToken(token);
  if (!email) {
    return new NextResponse("invalid or expired token", { status: 400 });
  }
  const res = await optOut(email, "email-link");
  if (!res.ok) {
    return new NextResponse("error", { status: 500 });
  }
  return new NextResponse(landingPage(email), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
