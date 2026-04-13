import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

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

    const body = await req.json() as { code?: string };
    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ ok: false, error: "Código é obrigatório" }, { status: 400 });
    }

    // Find pending relationship with this code
    const { data: relationship, error: findErr } = await supabase
      .from("mentor_relationships")
      .select("id, mentor_id")
      .ilike("invite_code", code)
      .eq("status", "pending")
      .is("student_id", null)
      .limit(1)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json({ ok: false, error: "Erro ao buscar código" }, { status: 500 });
    }

    if (!relationship) {
      return NextResponse.json({ ok: false, error: "Código inválido ou já utilizado" }, { status: 404 });
    }

    // Prevent self-linking
    if (relationship.mentor_id === user.id) {
      return NextResponse.json({ ok: false, error: "Não é possível vincular a si mesmo" }, { status: 400 });
    }

    // Check if student already has an active relationship with this mentor
    const { data: existingLink, error: checkErr } = await supabase
      .from("mentor_relationships")
      .select("id")
      .eq("mentor_id", relationship.mentor_id)
      .eq("student_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (checkErr) {
      return NextResponse.json({ ok: false, error: "Erro ao verificar vínculo" }, { status: 500 });
    }

    if (existingLink) {
      return NextResponse.json({ ok: false, error: "Você já está vinculado a este mentor" }, { status: 409 });
    }

    // Activate the relationship
    const { error: updateErr } = await supabase
      .from("mentor_relationships")
      .update({ student_id: user.id, status: "active" })
      .eq("id", relationship.id);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: "Erro ao vincular mentor" }, { status: 500 });
    }

    // Fetch mentor display name
    const { data: mentorProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", relationship.mentor_id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      mentorId: relationship.mentor_id,
      mentorName: mentorProfile?.display_name ?? "Mentor",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const { error: updateErr } = await supabase
      .from("mentor_relationships")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("student_id", user.id)
      .eq("status", "active");

    if (updateErr) {
      return NextResponse.json({ ok: false, error: "Erro ao desvincular mentor" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
