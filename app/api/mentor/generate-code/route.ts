import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isMentorPlan } from "@/lib/mentor-guard";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(bytes[i] % chars.length);
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseClientForUser(token);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const svc = createServiceRoleClient();
    if (!(await isMentorPlan(svc, user.id))) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a mentores" }, { status: 403 });
    }

    // Check if mentor already has an unused pending code
    const { data: existing, error: fetchErr } = await supabase
      .from("mentor_relationships")
      .select("invite_code")
      .eq("mentor_id", user.id)
      .eq("status", "pending")
      .is("student_id", null)
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar códigos existentes" }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ ok: true, code: existing.invite_code });
    }

    // Generate new code
    const code = generateCode();
    const { error: insertErr } = await supabase
      .from("mentor_relationships")
      .insert({
        mentor_id: user.id,
        invite_code: code,
        status: "pending",
      });

    if (insertErr) {
      return NextResponse.json({ ok: false, error: "Erro ao gerar código" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
