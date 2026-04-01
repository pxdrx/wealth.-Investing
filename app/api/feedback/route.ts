import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { feedbackRateLimit } from "@/lib/rate-limit";

const VALID_CATEGORIES = ["bug", "erro", "sugestao", "analise"] as const;
const FEEDBACK_EMAIL = "wealth.investing@outlook.com";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseClientForUser(token);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    // 2. Rate limit
    const { success } = await feedbackRateLimit.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { ok: false, error: "Muitas solicitações. Tente novamente em alguns minutos." },
        { status: 429 },
      );
    }

    // 3. Parse + validate body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { category, message } = body;

    if (!category || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      return NextResponse.json({ ok: false, error: "Categoria inválida" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json(
        { ok: false, error: "Mensagem deve ter pelo menos 10 caracteres" },
        { status: 400 },
      );
    }

    const trimmedMessage = (message as string).trim();

    // 4. Insert into Supabase
    const { error: dbError } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      category,
      message: trimmedMessage,
      user_email: user.email,
    });

    if (dbError) {
      console.error("[feedback] DB insert error:", dbError.message);
      return NextResponse.json({ ok: false, error: "Erro ao salvar feedback" }, { status: 500 });
    }

    // 5. Send email via Resend (fire-and-forget — DB is source of truth)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      import("resend").then(({ Resend }) => {
        const resend = new Resend(resendApiKey);
        resend.emails.send({
          from: "wealth.Investing Feedback <feedback@owealthinvesting.com>",
          to: FEEDBACK_EMAIL,
          subject: `[Feedback] ${(category as string).toUpperCase()} — ${user.email}`,
          html: `
            <h2>Novo Feedback</h2>
            <p><strong>Categoria:</strong> ${category}</p>
            <p><strong>Usuário:</strong> ${user.email} (${user.id})</p>
            <p><strong>Mensagem:</strong></p>
            <p>${trimmedMessage.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
          `,
        }).catch((err: unknown) => console.error("[feedback] Email send error:", err));
      }).catch((err: unknown) => console.error("[feedback] Resend import error:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feedback] Error:", err);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
